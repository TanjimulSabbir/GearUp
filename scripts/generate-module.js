import fs from "fs";
import path from "path";

const modules = process.argv.slice(2);

if (modules.length === 0) {
  console.log("Usage: npm run module category user payment");
  process.exit(1);
}

const files = [
  "controller",
  "service",
  "routes",
  "validation",
  "interface",
  "model",
];

modules.forEach((name) => {
  const dir = path.join("src", "modules", name);

  fs.mkdirSync(dir, { recursive: true });

  files.forEach((file) => {
    const fileName = `${name}.${file}.ts`;
    const filePath = path.join(dir, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "");
    }
  });

  console.log(`✅ ${name} module created`);
});
