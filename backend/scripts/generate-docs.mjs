/**
 * Automated API & Database Documentation PDF Generator.
 * Dynamically parses prisma/schema.prisma and docs/openapi.yaml and compiles
 * a comprehensive, publication-grade PDF using PDFKit.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const SCHEMA_PATH = path.join(ROOT_DIR, 'prisma', 'schema.prisma');
const OPENAPI_PATH = path.join(ROOT_DIR, 'docs', 'openapi.yaml');
const OUTPUT_PDF_PATH = path.join(ROOT_DIR, 'docs', 'GHAZAL_JEWELLERY_API_DATABASE_DOCUMENTATION.pdf');

// ─── 1. Parse Prisma Schema ──────────────────────────────────────
function parsePrismaSchema(schemaContent) {
  const models = [];
  const enums = [];

  const lines = schemaContent.split(/\r?\n/);
  let currentModel = null;
  let currentEnum = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Start Model
    const modelMatch = trimmed.match(/^model\s+(\w+)\s+\{/);
    if (modelMatch) {
      currentModel = {
        name: modelMatch[1],
        fields: [],
        indexes: [],
        uniques: [],
      };
      continue;
    }

    // Start Enum
    const enumMatch = trimmed.match(/^enum\s+(\w+)\s+\{/);
    if (enumMatch) {
      currentEnum = {
        name: enumMatch[1],
        values: [],
      };
      continue;
    }

    // End block
    if (trimmed === '}') {
      if (currentModel) {
        models.push(currentModel);
        currentModel = null;
      }
      if (currentEnum) {
        enums.push(currentEnum);
        currentEnum = null;
      }
      continue;
    }

    // Inside Enum
    if (currentEnum && trimmed && !trimmed.startsWith('//')) {
      currentEnum.values.push(trimmed);
      continue;
    }

    // Inside Model
    if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('///')) {
      if (trimmed.startsWith('@@index')) {
        currentModel.indexes.push(trimmed);
      } else if (trimmed.startsWith('@@unique')) {
        currentModel.uniques.push(trimmed);
      } else {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const fieldName = parts[0];
          const fieldType = parts[1];
          const attributes = parts.slice(2).join(' ');
          currentModel.fields.push({
            name: fieldName,
            type: fieldType,
            attributes: attributes || '-',
          });
        }
      }
    }
  }

  return { models, enums };
}

// ─── 2. Parse OpenAPI Specification ─────────────────────────────
function parseOpenApi(openApiContent) {
  return YAML.parse(openApiContent);
}

// ─── 3. Generate PDF Document ───────────────────────────────────
async function generatePdf() {
  console.log('Generating Ghazal Jewellery API & Database PDF Documentation...');

  const schemaRaw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const openapiRaw = fs.readFileSync(OPENAPI_PATH, 'utf-8');

  const { models, enums } = parsePrismaSchema(schemaRaw);
  const openApi = parseOpenApi(openapiRaw);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
  });

  const writeStream = fs.createWriteStream(OUTPUT_PDF_PATH);
  doc.pipe(writeStream);

  const PRIMARY_COLOR = '#8B5A2B'; // Luxury Bronze / Gold tone
  const SECONDARY_COLOR = '#2C3E50';
  const TEXT_COLOR = '#333333';
  const LIGHT_BG = '#F9F9F9';

  // ════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════════
  doc.rect(0, 0, doc.page.width, 15).fill(PRIMARY_COLOR);

  doc.moveDown(6);
  doc
    .fillColor(PRIMARY_COLOR)
    .font('Helvetica-Bold')
    .fontSize(32)
    .text('GHAZAL JEWELLERY', { align: 'center', characterSpacing: 2 });

  doc
    .moveDown(0.5)
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica')
    .fontSize(16)
    .text('Backend REST API & Database Architecture', { align: 'center' });

  doc
    .moveDown(0.3)
    .fontSize(12)
    .fillColor('#7F8C8D')
    .text(`API Version: ${openApi.info?.version || '1.0.0'} | Environment: Production Ready`, { align: 'center' });

  doc.moveDown(4);

  // Decorative Box
  doc
    .rect(60, 280, doc.page.width - 120, 160)
    .fillAndStroke('#FDFEFE', '#BDC3C7');

  doc
    .fillColor(SECONDARY_COLOR)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('DOCUMENT SUMMARY & METADATA', 80, 300);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(TEXT_COLOR)
    .text(`• Total Prisma Database Models: ${models.length}`, 80, 325)
    .text(`• Total Database Enums: ${enums.length}`, 80, 342)
    .text(`• Total Documented REST Endpoints: ${Object.keys(openApi.paths || {}).length} route paths`, 80, 359)
    .text(`• Database Engine: Supabase PostgreSQL (PgBouncer Pooled + Direct Connection)`, 80, 376)
    .text(`• ORM Layer: Prisma ORM v6.19.3 with BigInt paise serialization`, 80, 393)
    .text(`• Document Generated: ${new Date().toUTCString()}`, 80, 410);

  doc.moveDown(12);
  doc
    .font('Helvetica-Oblique')
    .fontSize(10)
    .fillColor('#95A5A6')
    .text('Automated system documentation compiled from prisma/schema.prisma & docs/openapi.yaml', {
      align: 'center',
    });

  // ════════════════════════════════════════════════════════════════
  // SECTION 1: ARCHITECTURE & TECHNOLOGY STACK
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(20).text('1. System Architecture & Tech Stack');
  doc.moveDown(0.5);
  doc.strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(1);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(TEXT_COLOR)
    .text(
      'The Ghazal Jewellery backend is designed around a decoupled, high-performance architecture supporting web and mobile clients with rigorous inventory controls and transactional integrity.',
      { lineGap: 4 }
    );

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('End-to-End Request Flow:');
  doc.moveDown(0.5);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(TEXT_COLOR)
    .text('Client (SPA / Mobile) → HTTPS → Express App (Helmet, CORS, Rate Limiters, JSON Parser)', { indent: 20 })
    .text('  → Authentication Middleware (Bearer JWT or HttpOnly secure cookies)', { indent: 20 })
    .text('  → Request Validation Layer (Zod strictly typed schemas)', { indent: 20 })
    .text('  → Controller & Domain Services (Transactional business rules)', { indent: 20 })
    .text('  → Prisma Client ORM (BigInt paise monetary precision)', { indent: 20 })
    .text('  → Supabase PostgreSQL (PgBouncer port 6543 at runtime / Direct port 5432)', { indent: 20 });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('Key Technology Choices:');
  doc.moveDown(0.5);
  const techStack = [
    ['Node.js (v22+)', 'Modern runtime utilizing ES Modules (ESM)'],
    ['Express.js 5', 'Fast web framework with centralized error handling'],
    ['Supabase PostgreSQL', 'Fully managed cloud relational database'],
    ['Prisma ORM 6', 'Type-safe queries, relations, and connection pooling'],
    ['Zod', 'Runtime schema validation across all request inputs'],
    ['Bcrypt & JWT', 'Cryptographically secure password hashing and stateless tokens'],
    ['Helmet & CORS', 'Industry-standard security headers and origin protections'],
  ];

  techStack.forEach(([tech, desc]) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY_COLOR).text(`• ${tech}: `, { continued: true });
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR).text(desc);
  });

  // ════════════════════════════════════════════════════════════════
  // SECTION 2: DATABASE DOCUMENTATION
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(20).text('2. Database Schema & Models');
  doc.moveDown(0.5);
  doc.strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(1);

  // Enums
  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('Database Enums:');
  doc.moveDown(0.5);
  enums.forEach((en) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY_COLOR).text(`enum ${en.name}: `, { continued: true });
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR).text(en.values.join(' | '));
  });

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('Prisma Models & Tables:');
  doc.moveDown(0.5);

  for (const model of models) {
    if (doc.y > 680) doc.addPage();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(PRIMARY_COLOR).text(`Model: ${model.name}`);
    doc.moveDown(0.2);

    // Table header
    const startX = 50;
    const colWidths = [140, 110, 240];
    const rowHeight = 16;

    doc.rect(startX, doc.y, 490, rowHeight).fill('#EAEDED');
    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(8);
    doc.text('Field Name', startX + 5, doc.y + 4);
    doc.text('Data Type', startX + colWidths[0], doc.y);
    doc.text('Constraints / Relations / Defaults', startX + colWidths[0] + colWidths[1], doc.y);
    doc.moveDown(0.8);

    doc.font('Helvetica').fontSize(8).fillColor(TEXT_COLOR);
    for (const field of model.fields) {
      if (doc.y > 740) doc.addPage();

      const y = doc.y;
      doc.rect(startX, y, 490, rowHeight).strokeColor('#E5E7E9').stroke();
      doc.text(field.name, startX + 5, y + 4, { width: colWidths[0] - 10, lineBreak: false });
      doc.text(field.type, startX + colWidths[0], y + 4, { width: colWidths[1] - 10, lineBreak: false });
      doc.text(field.attributes, startX + colWidths[0] + colWidths[1], y + 4, {
        width: colWidths[2] - 10,
        lineBreak: false,
      });
      doc.moveDown(0.7);
    }

    if (model.indexes.length > 0) {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#7F8C8D');
      doc.text(`Indexes: ${model.indexes.join('; ')}`, { indent: 5 });
    }
    doc.moveDown(0.8);
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 3: REST API ENDPOINTS SPECIFICATION
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(20).text('3. Complete REST API Specification');
  doc.moveDown(0.5);
  doc.strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(1);

  const paths = openApi.paths || {};

  for (const [pathStr, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'patch', 'delete', 'put'].includes(method.toLowerCase())) {
        if (doc.y > 660) doc.addPage();

        const methodUpper = method.toUpperCase();
        let badgeColor = '#2980B9'; // Blue for GET
        if (methodUpper === 'POST') badgeColor = '#27AE60'; // Green
        if (methodUpper === 'PATCH' || methodUpper === 'PUT') badgeColor = '#E67E22'; // Orange
        if (methodUpper === 'DELETE') badgeColor = '#C0392B'; // Red

        // Badge
        doc.rect(50, doc.y, 45, 14).fill(badgeColor);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8).text(methodUpper, 53, doc.y + 3);

        // Path
        doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(10).text(pathStr, 105, doc.y - 11);
        doc.moveDown(0.4);

        // Summary
        if (operation.summary) {
          doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR).text(operation.summary, { indent: 10 });
        }

        // Tag & Auth
        const hasAuth = operation.security && operation.security.length > 0;
        doc
          .font('Helvetica-Oblique')
          .fontSize(8)
          .fillColor('#7F8C8D')
          .text(`Category: ${operation.tags?.join(', ') || 'General'} | Auth: ${hasAuth ? 'Required (JWT / Cookie)' : 'Public'}`, {
            indent: 10,
          });

        doc.moveDown(0.6);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 4: SECURITY & OPERATIONAL MANUAL
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(20).text('4. Security & Operational Guide');
  doc.moveDown(0.5);
  doc.strokeColor('#BDC3C7').lineWidth(1).moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('Security Protections:');
  doc.moveDown(0.4);
  const securityNotes = [
    ['Email Protection', 'Normalized case-insensitively. Generic login failure messages prevent account harvesting.'],
    ['Password Policy', 'Bcrypt hashed with 12 salt rounds. Minimum 8 characters requiring letters and numbers.'],
    ['Role Authorization', 'Strict separation between CUSTOMER and ADMIN. Public registration enforces CUSTOMER unconditionally.'],
    ['Inventory Controls', 'Atomically reserves/decrements stock during checkout transaction to prevent race conditions.'],
    ['Immutable Snapshots', 'Purchased product details, variant specs, and prices are permanently snapshotted in order items.'],
  ];
  securityNotes.forEach(([title, desc]) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY_COLOR).text(`• ${title}: `, { continued: true });
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_COLOR).text(desc);
  });

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(SECONDARY_COLOR).text('Operational Commands:');
  doc.moveDown(0.4);
  const ops = [
    ['Start Server', 'npm start (Runs on http://localhost:3000)'],
    ['Development Mode', 'npm run dev (Auto-reloads with Node watch mode)'],
    ['Run Test Suites', 'npm test (Executes complete automated validation)'],
    ['Regenerate This PDF', 'npm run docs:pdf (Parses schema & OpenAPI and updates this PDF)'],
  ];
  ops.forEach(([title, cmd]) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(SECONDARY_COLOR).text(`• ${title}: `, { continued: true });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#16A085').text(cmd);
  });

  // ════════════════════════════════════════════════════════════════
  // PAGE NUMBERS & FOOTER ON ALL PAGES
  // ════════════════════════════════════════════════════════════════
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Skip footer on cover page
    if (i > 0) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#BDC3C7')
        .text('Ghazal Jewellery | Confidential Backend Specification', 50, doc.page.height - 35, {
          align: 'left',
        });

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#BDC3C7')
        .text(`Page ${i + 1} of ${pages.count}`, 0, doc.page.height - 35, {
          align: 'right',
        });
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`✅ PDF successfully generated at: ${OUTPUT_PDF_PATH}`);
      resolve(OUTPUT_PDF_PATH);
    });
    writeStream.on('error', reject);
  });
}

generatePdf().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});

