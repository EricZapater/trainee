package uploader

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type Uploader struct {
	s3Client   *s3.Client
	bucketName string
	publicURL  string
	useR2      bool
}

func NewUploader() (*Uploader, error) {
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	accountID := os.Getenv("R2_ACCOUNT_ID")
	bucketName := os.Getenv("R2_BUCKET_NAME")
	publicURL := os.Getenv("R2_PUBLIC_URL")

	if accessKeyID == "" || secretAccessKey == "" || accountID == "" || bucketName == "" || publicURL == "" {
		// Fallback to local storage
		log.Println("Avis: R2 no configurat completament. S'utilitzara l'emmagatzematge local ./uploads.")
		return &Uploader{useR2: false}, nil
	}

	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		log.Printf("Avis: Error carregant configuracio R2 (%v). S'utilitzara fallback local.", err)
		return &Uploader{useR2: false}, nil
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return &Uploader{
		s3Client:   client,
		bucketName: bucketName,
		publicURL:  publicURL,
		useR2:      true,
	}, nil
}

func (u *Uploader) UploadFile(ctx context.Context, fileHeader *multipart.FileHeader, folder string) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", fmt.Errorf("error obrint fitxer pujat: %w", err)
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	newFilename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)
	key := fmt.Sprintf("%s/%s", folder, newFilename)

	// Desament local com a copia / fallback
	localFolder := filepath.Join("uploads", folder)
	if err := os.MkdirAll(localFolder, 0755); err != nil {
		return "", fmt.Errorf("error creant directori local: %w", err)
	}

	localPath := filepath.Join(localFolder, newFilename)
	out, err := os.Create(localPath)
	if err != nil {
		return "", fmt.Errorf("error creant fitxer local: %w", err)
	}

	if _, err := io.Copy(out, file); err != nil {
		out.Close()
		return "", fmt.Errorf("error copiant fitxer localment: %w", err)
	}
	out.Close()

	localURL := fmt.Sprintf("/api/uploads/%s/%s", folder, newFilename)

	if !u.useR2 {
		return localURL, nil
	}

	// Reposicionar el punter del fitxer per a la pujada a R2
	if seeker, ok := file.(io.Seeker); ok {
		if _, err := seeker.Seek(0, io.SeekStart); err != nil {
			log.Printf("Avis: No s'ha pogut fer seek al fitxer per R2 (%v). S'usa URL local: %s", err, localURL)
			return localURL, nil
		}
	} else {
		// Reobrir fitxer si no admet Seek
		file.Close()
		reopened, err := fileHeader.Open()
		if err != nil {
			return localURL, nil
		}
		defer reopened.Close()
		file = reopened
	}

	// Pujada a Cloudflare R2
	_, err = u.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(fileHeader.Header.Get("Content-Type")),
	})
	if err != nil {
		log.Printf("Avis: Error pujant a Cloudflare R2 (%v). Retornant URL local %s", err, localURL)
		return localURL, nil
	}

	publicURLClean := strings.TrimSuffix(u.publicURL, "/")
	return fmt.Sprintf("%s/%s", publicURLClean, key), nil
}

