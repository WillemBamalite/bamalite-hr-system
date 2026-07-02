import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { PDFDocument } from "pdf-lib"

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/forms/luxembourg-a1")

async function dump(path) {
  const bytes = readFileSync(join(dir, path))
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  console.log("\n===", path, "fields:", form.getFields().length, "===")
  for (const field of form.getFields()) {
    const name = field.getName()
    const type = field.constructor.name
    try {
      if (type.includes("PDFTextField")) {
        console.log(name, "=>", JSON.stringify(field.getText()))
      } else if (type.includes("PDFCheckBox")) {
        console.log(name, "=>", field.isChecked() ? "CHECKED" : "-")
      } else if (type.includes("PDFRadioGroup")) {
        console.log(name, "=>", field.getSelected(), "opts:", field.getOptions())
      }
    } catch (e) {
      console.log(name, "=>", e.message)
    }
  }
}

await dump("ccss-formulaire-activites-etranger-batelierrhenan-FR (9).pdf")
await dump("CCSS ingevuld.pdf")
