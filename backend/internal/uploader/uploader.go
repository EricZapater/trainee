package uploader

import (
	"context"
	"fmt"
	"io"
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

	if accessKeyID == "" || secretAccessKey == "" || accountID == "" || bucketName == "" {
		// Fallback to local storage
		return &Uploader{useR2: false}, nil
	}

	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, err
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
		return "", err
	}
	defer file.Close()

	ext := filepath.Ext(fileHeader.Filename)
	newFilename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)
	key := fmt.Sprintf("%s/%s", folder, newFilename)

	if !u.useR2 {
		// Fallback local storage
		localFolder := filepath.Join("uploads", folder)
		if err := os.MkdirAll(localFolder, 0755); err != nil {
			return "", err
		}
		localPath := filepath.Join(localFolder, newFilename)
		out, err := os.Create(localPath)
		if err != nil {
			return "", err
		}
		defer out.Close()
		if _, err := io.Copy(out, file); err != nil {
			return "", err
		}
		return fmt.Sprintf("/api/uploads/%s/%s", folder, newFilename), nil
	}

	// Upload to R2
	_, err = u.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(fileHeader.Header.Get("Content-Type")),
	})
	if err != nil {
		return "", err
	}

	publicURLClean := strings.TrimSuffix(u.publicURL, "/")
	return fmt.Sprintf("%s/%s", publicURLClean, key), nil
}
