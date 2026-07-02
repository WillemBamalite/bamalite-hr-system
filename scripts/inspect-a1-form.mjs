import { readFileSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { PDFDocument } from "pdf-lib"

const __dirname = dirname(fileURLToPath(import.meta.url))
const folder = join(__dirname, "../public/forms/luxembourg-a1")

const formFile = "ccss-formulaire-activites-etranger-batelierrhenan-FR (9).pdf"
const bytes = readFileSync(join(folder, formFile))
const pdfDoc = await PDFDocument.load(bytes)
const form = pdfDoc.getForm()
const fields = form.getFields()

console.log("=== CCSS FORM:", formFile, "===")
console.log("Pages:", pdfDoc.getPageCount())
console.log("Form fields:", fields.length)
console.log("")

for (const field of fields) {
  const name = field.getName()
  const type = field.constructor.name
  let extra = ""
  try {
    if (type.includes("PDFTextField")) {
      extra = ` maxLen=${field.getMaxLength?.() ?? "?"}`
    }
    if (type.includes("PDFCheckBox")) {
      extra = ` checked=${field.isChecked()}`
    }
    if (type.includes("PDFDropdown") || type.includes("PDFOptionList")) {
      const opts = field.getOptions?.() ?? []
      extra = ` options=[${opts.slice(0, 5).join(", ")}${opts.length > 5 ? "..." : ""}]`
    }
  } catch {
    /* ignore */
  }
  console.log(`${name} | ${type}${extra}`)
}

console.log("\n=== FILES IN FOLDER ===\n")
const files = readdirSync(folder).filter((f) => f.endsWith(".pdf")).sort()
for (const f of files) console.log(f)
