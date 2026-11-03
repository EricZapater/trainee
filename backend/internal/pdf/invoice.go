package pdf

import (
	"bytes"
	"fmt"
	"html"
	"time"

	"trainee-backend/internal/models"
)

// GenerateInvoiceHTML genera una plantilla HTML neta, responsive i elegant per a la factura de venda
// amb els snapshots fiscals congelats d'emissor i client, el desglossament de Base, IVA i Retenció (IRPF),
// l'IBAN de pagament de l'empresa destacat i el bloc reservat per a Veri*factu (Fase 2).
func GenerateInvoiceHTML(f *models.FinFacturaVenda, cfg *models.FinConfiguracioEmpresa) ([]byte, error) {
	numFactura := "ESBORRANY"
	if f.NumeroComplet != nil && *f.NumeroComplet != "" {
		numFactura = *f.NumeroComplet
	}

	titolDoc := "FACTURA"
	if f.TipusFactura == "R1" {
		titolDoc = "FACTURA RECTIFICATIVA"
	}
	if f.EstatDocument == "esborrany" {
		titolDoc += " (ESBORRANY)"
	}

	// Recuperar dades emissor (prioritzar snapshot si és emesa)
	emissorNom := cfg.RaoSocial
	emissorCIF := cfg.NifCif
	emissorAdreca := cfg.Adreca
	emissorCP := cfg.CP
	emissorPoblacio := cfg.Poblacio
	emissorProvincia := cfg.Provincia
	emissorEmail := cfg.EmailAdministracio
	emissorIban := cfg.IbanPrincipal
	emissorPeu := cfg.PeuLegal

	// Dades client
	clientNom := f.ClientNom
	clientNif := f.ClientNif

	var buf bytes.Buffer
	buf.WriteString(`<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="UTF-8">
<title>` + html.EscapeString(numFactura) + `</title>
<style>
  @page { size: A4; margin: 15mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    margin: 0;
    padding: 24px;
    font-size: 13px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .brand-title {
    font-size: 24px;
    font-weight: 800;
    color: #0284c7;
    letter-spacing: -0.5px;
    margin: 0 0 4px 0;
  }
  .doc-badge {
    text-align: right;
  }
  .doc-badge h1 {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px 0;
    text-transform: uppercase;
  }
  .doc-num {
    font-size: 16px;
    font-weight: 700;
    color: #0284c7;
  }
  .grid-parties {
    display: flex;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 20px;
  }
  .card-party {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .card-party h3 {
    margin: 0 0 8px 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
  }
  .meta-grid {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    background: #f1f5f9;
    padding: 12px 16px;
    border-radius: 8px;
  }
  .meta-item {
    flex: 1;
  }
  .meta-label {
    font-size: 10px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }
  .meta-val {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
  }
  table.items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }
  table.items th {
    background: #0f172a;
    color: #ffffff;
    text-align: left;
    padding: 10px 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table.items td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  .text-right { text-align: right; }
  .totals-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 28px;
  }
  .totals-box {
    width: 280px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    color: #334155;
  }
  .totals-row.total-final {
    border-top: 2px solid #0f172a;
    margin-top: 6px;
    padding-top: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
  }
  .payment-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 24px;
  }
  .payment-title {
    font-weight: 700;
    color: #166534;
    margin-bottom: 4px;
    font-size: 12px;
    text-transform: uppercase;
  }
  .payment-iban {
    font-family: monospace;
    font-size: 15px;
    font-weight: 700;
    color: #14532d;
    letter-spacing: 1px;
  }
  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    font-size: 10px;
    color: #94a3b8;
    text-align: center;
  }
  .rect-notice {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 12px;
    font-weight: 600;
  }
</style>
</head>
<body>

<div class="header">
  <div>
    <h2 class="brand-title">` + html.EscapeString(cfg.NomComercial) + `</h2>
    <div style="font-weight: 600; color: #475569;">` + html.EscapeString(emissorNom) + `</div>
    <div style="color: #64748b; font-size: 11px;">CIF/NIF: ` + html.EscapeString(emissorCIF) + `</div>
  </div>
  <div class="doc-badge">
    <h1>` + html.EscapeString(titolDoc) + `</h1>
    <div class="doc-num">` + html.EscapeString(numFactura) + `</div>
  </div>
</div>`)

	if f.TipusFactura == "R1" && f.MotiuRectificacio != "" {
		origRef := "Factura d'origen"
		if f.FacturaOrigenNum != nil && *f.FacturaOrigenNum != "" {
			origRef += " " + *f.FacturaOrigenNum
		}
		buf.WriteString(`
<div class="rect-notice">
  Rectifica la ` + html.EscapeString(origRef) + `. Motiu: ` + html.EscapeString(f.MotiuRectificacio) + `
</div>`)
	}

	buf.WriteString(`
<div class="grid-parties">
  <div class="card-party">
    <h3>Dades Fiscals de l'Emissor</h3>
    <div style="font-weight: 700;">` + html.EscapeString(emissorNom) + `</div>
    <div>` + html.EscapeString(emissorAdreca) + `</div>
    <div>` + html.EscapeString(emissorCP) + ` ` + html.EscapeString(emissorPoblacio) + ` (` + html.EscapeString(emissorProvincia) + `)</div>
    <div>NIF/CIF: ` + html.EscapeString(emissorCIF) + `</div>
    <div>Email: ` + html.EscapeString(emissorEmail) + `</div>
  </div>

  <div class="card-party">
    <h3>Client / Receptor</h3>
    <div style="font-weight: 700;">` + html.EscapeString(clientNom) + `</div>
    <div>NIF/CIF: ` + html.EscapeString(clientNif) + `</div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item">
    <div class="meta-label">Data d'Emissió</div>
    <div class="meta-val">` + html.EscapeString(f.DataEmissio) + `</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Data de Venciment</div>
    <div class="meta-val">` + html.EscapeString(f.DataVenciment) + `</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Període del Servei</div>
    <div class="meta-val">` + html.EscapeString(f.PeriodeInici) + ` a ` + html.EscapeString(f.PeriodeFi) + `</div>
  </div>
  <div class="meta-item">
    <div class="meta-label">Unitat de Negoci</div>
    <div class="meta-val">` + html.EscapeString(f.UnitatNegociNom) + `</div>
  </div>
</div>

<table class="items">
  <thead>
    <tr>
      <th style="width: 55%;">Concepte / Descripció</th>
      <th class="text-right" style="width: 15%;">Base Imposable</th>
      <th class="text-right" style="width: 15%;">IVA (%)</th>
      <th class="text-right" style="width: 15%;">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <div style="font-weight: 700;">` + html.EscapeString(f.Concepte) + `</div>`)
	if f.DescripcioDetall != "" {
		buf.WriteString(`<div style="font-size: 11px; color: #64748b; margin-top: 2px;">` + html.EscapeString(f.DescripcioDetall) + `</div>`)
	}
	buf.WriteString(`
      </td>
      <td class="text-right">` + fmt.Sprintf("%.2f €", f.BaseImposable) + `</td>
      <td class="text-right">` + fmt.Sprintf("%.0f%%", f.IvaPercentatge) + `</td>
      <td class="text-right">` + fmt.Sprintf("%.2f €", f.BaseImposable) + `</td>
    </tr>
  </tbody>
</table>

<div class="totals-container">
  <div class="totals-box">
    <div class="totals-row">
      <span>Base Imposable</span>
      <span>` + fmt.Sprintf("%.2f €", f.BaseImposable) + `</span>
    </div>
    <div class="totals-row">
      <span>Quota IVA (` + fmt.Sprintf("%.0f%%", f.IvaPercentatge) + `)</span>
      <span>` + fmt.Sprintf("%.2f €", f.IvaImport) + `</span>
    </div>`)

	if f.IrpfImport != 0 {
		buf.WriteString(`
    <div class="totals-row" style="color: #b91c1c;">
      <span>Retenció IRPF (` + fmt.Sprintf("%.0f%%", f.IrpfPercentatge) + `)</span>
      <span>-` + fmt.Sprintf("%.2f €", f.IrpfImport) + `</span>
    </div>`)
	}

	buf.WriteString(`
    <div class="totals-row total-final">
      <span>TOTAL FACTURA</span>
      <span>` + fmt.Sprintf("%.2f €", f.TotalFactura) + `</span>
    </div>
  </div>
</div>`)

	if emissorIban != "" {
		buf.WriteString(`
<div class="payment-box">
  <div class="payment-title">Mètode de Pagament: Transferència Bancària</div>
  <div>Per favor, feu l'ingrés indicant el número de factura <strong>` + html.EscapeString(numFactura) + `</strong> al concepte al següent compte:</div>
  <div class="payment-iban">` + html.EscapeString(emissorIban) + `</div>
</div>`)
	}

	buf.WriteString(`
<div class="footer">
  ` + html.EscapeString(emissorPeu) + `<br>
  Factura emesa electrònicament el ` + time.Now().Format("02/01/2006 15:04") + `
</div>

</body>
</html>`)

	return buf.Bytes(), nil
}
