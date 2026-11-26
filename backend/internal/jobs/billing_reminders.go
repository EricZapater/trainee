package jobs

import (
	"context"
	"fmt"
	"log"
	"time"

	"trainee-backend/internal/mailer"
	"trainee-backend/internal/store"
)

// RunDailyBillingReminders comprova el dia límit de pagament de l'empresa:
// - Si avui == dia_limit_pagament: envia email informatiu a cada entrenador amb els seus atletes no conciliats.
// - Si avui == dia_limit_pagament + 1: envia email molt amable a cada atleta que continuï pendent de pagar.
func RunDailyBillingReminders(s store.Store, mail mailer.Mailer) error {
	ctx := context.Background()
	cfg, err := s.GetFinConfiguracioEmpresa(ctx)
	if err != nil {
		return fmt.Errorf("error obtenint configuracio empresa: %w", err)
	}
	if !cfg.AvisosImpagamentActius {
		log.Println("[CRON-BILLING] Avisos automàtics d'impagament desactivats a configuració d'empresa.")
		return nil
	}

	loc, errLoc := time.LoadLocation("Europe/Madrid")
	if errLoc != nil {
		loc = time.Local
	}
	now := time.Now().In(loc)
	todayDay := now.Day()
	diaLimit := cfg.DiaLimitPagament
	if diaLimit < 1 || diaLimit > 27 {
		diaLimit = 5
	}

	if todayDay == diaLimit {
		_, err := ExecuteBillingReminderAction(ctx, s, mail, "entrenadors", now)
		return err
	}
	if todayDay == diaLimit+1 {
		_, err := ExecuteBillingReminderAction(ctx, s, mail, "atletes", now)
		return err
	}

	return nil
}

func ExecuteBillingReminderAction(ctx context.Context, s store.Store, mail mailer.Mailer, mode string, refTime time.Time) (int, error) {
	cfg, err := s.GetFinConfiguracioEmpresa(ctx)
	if err != nil {
		return 0, err
	}
	cutoffDate := refTime.Format("2006-01-02")
	anyMes := refTime.Format("2006-01")
	sentCount := 0

	if mode == "entrenadors" {
		groups, err := s.GetPendingCoachBillingNotices(ctx, cutoffDate, anyMes)
		if err != nil {
			return 0, err
		}
		for _, g := range groups {
			if len(g.Items) == 0 {
				continue
			}
			if err := mail.SendCoachUnconciliatedSummary(g.EntrenadorEmail, g.EntrenadorNom, anyMes, g.Items, g.Idioma); err != nil {
				log.Printf("[CRON-BILLING] Error enviant resum d'atletes no conciliats a %s: %v", g.EntrenadorEmail, err)
				continue
			}
			cID := g.EntrenadorID
			_ = s.LogBillingNoticeSent(ctx, "entrenador_dia_limit", anyMes, &cID, g.EntrenadorEmail, nil)
			sentCount++
		}
		resum := fmt.Sprintf("Avisos Dia Límit enviats a %d entrenadors (%s)", sentCount, anyMes)
		log.Printf("[CRON-BILLING] %s", resum)
		s.AddSystemLog(ctx, "cron_billing_entrenadors", "INFO", resum, nil)
		return sentCount, nil
	}

	if mode == "atletes" {
		items, err := s.GetPendingAthletePoliteNotices(ctx, cutoffDate, anyMes)
		if err != nil {
			return 0, err
		}
		nomComercial := cfg.NomComercial
		if nomComercial == "" {
			nomComercial = cfg.RaoSocial
		}
		for _, it := range items {
			err := mail.SendPolitePaymentReminder(
				it.AtletaEmail,
				it.AtletaNom,
				it.NumeroFactura,
				it.Concepte,
				it.TotalFactura,
				it.ImportPendent,
				it.DataVenciment,
				cfg.IbanPrincipal,
				nomComercial,
				it.Idioma,
			)
			if err != nil {
				log.Printf("[CRON-BILLING] Error enviant recordatori amable a %s: %v", it.AtletaEmail, err)
				continue
			}
			fID := it.FacturaID
			_ = s.LogBillingNoticeSent(ctx, "atleta_dia_limit_mes_1", anyMes, it.UsuariID, it.AtletaEmail, &fID)
			sentCount++
		}
		resum := fmt.Sprintf("Recordatoris amables (Dia Límit+1) enviats a %d atletes (%s)", sentCount, anyMes)
		log.Printf("[CRON-BILLING] %s", resum)
		s.AddSystemLog(ctx, "cron_billing_atletes", "INFO", resum, nil)
		return sentCount, nil
	}

	return 0, fmt.Errorf("mode d'avís desconegut: %s", mode)
}
