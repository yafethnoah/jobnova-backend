const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, Header, Footer, PageNumber } = require('docx');
const PDFDocument = require('pdfkit');

const GENERATED_DIR = path.join(__dirname, '..', 'data', 'generated');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'document';
}

function normalizeLines(text = '') {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
}

function splitResumeSections(text = '') {
  const lines = normalizeLines(text).filter((line) => line.trim());
  const knownHeadings = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'CORE SKILLS', 'KEY SKILLS', 'SELECTED EXPERIENCE',
    'PROFESSIONAL EXPERIENCE', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATIONS', 'LICENSES', 'LANGUAGES',
    'VOLUNTEER EXPERIENCE', 'COMMUNITY INVOLVEMENT', 'PROFESSIONAL DEVELOPMENT', 'TARGET ROLE ALIGNMENT', 'ADDITIONAL INFORMATION'
  ];
  const sections = [];
  let current = { heading: '', lines: [] };
  for (const raw of lines) {
    const line = raw.trim();
    const upper = line.toUpperCase().replace(/:$/, '');
    const isHeading = knownHeadings.includes(upper) || (/^[A-Z][A-Z\s/&-]{2,}$/.test(line) && line.length < 60);
    if (isHeading) {
      if (current.heading || current.lines.length) sections.push(current);
      current = { heading: upper, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading || current.lines.length) sections.push(current);
  return sections;
}

function themeConfig(theme = 'classic-canadian-professional', layout = 'one-page') {
  const dense = layout === 'one-page';
  const common = {
    margins: dense ? { top: 620, right: 700, bottom: 620, left: 700 } : { top: 760, right: 760, bottom: 760, left: 760 },
    line: dense ? 248 : 276,
    bodySize: dense ? 19 : 21,
    headingSize: dense ? 20 : 22,
    titleSize: dense ? 28 : 30,
    paragraphAfter: dense ? 70 : 100,
    bulletAfter: dense ? 55 : 85,
  };
  const map = {
    'modern-minimal': {
      titleColor: '0F2747', headingColor: '0F2747', accentColor: 'D9E4F0', contactColor: '4B607A', label: 'Modern Minimal'
    },
    'classic-canadian-professional': {
      titleColor: '102A56', headingColor: '1E3A6B', accentColor: 'D6DCE8', contactColor: '4B5C7A', label: 'Classic Canadian Professional'
    },
    'executive-clean': {
      titleColor: '16213A', headingColor: '23395B', accentColor: 'C9D5E6', contactColor: '5A6575', label: 'Executive Clean'
    },
    'nonprofit-academic-friendly': {
      titleColor: '243B4A', headingColor: '305E6C', accentColor: 'D7E4E7', contactColor: '5D6F76', label: 'Nonprofit / Academic Friendly'
    }
  };
  return { ...common, ...(map[theme] || map['classic-canadian-professional']), theme, layout };
}

function buildResumeDocChildren(title, text, config) {
  const sections = splitResumeSections(text);
  const top = normalizeLines(text).filter((line) => line.trim());
  const contactLine = sections[0]?.heading ? top.find((line) => /@|linkedin|\+?\d/.test(line)) : top[1];
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: title, bold: true, size: config.titleSize, color: config.titleColor })]
    })
  ];
  if (contactLine && contactLine !== title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [new TextRun({ text: contactLine, size: config.bodySize, color: config.contactColor })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: config.accentColor } }
    }));
  }
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 140 },
    children: [new TextRun({
      text: `${config.label} • ${config.layout === 'one-page' ? 'One-Page ATS Layout' : 'Two-Page ATS Layout'}`,
      italics: true,
      size: 18,
      color: config.contactColor
    })]
  }));

  for (const section of sections) {
    if (!section.heading) continue;
    children.push(new Paragraph({
      spacing: { before: 180, after: 70 },
      children: [new TextRun({ text: section.heading, bold: true, allCaps: true, color: config.headingColor, size: config.headingSize })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: config.accentColor } }
    }));
    for (const line of section.lines) {
      const isBullet = /^[-•*]\s+/.test(line);
      if (isBullet) {
        children.push(new Paragraph({
          text: line.replace(/^[-•*]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: config.bulletAfter },
          indent: { left: 240, hanging: 120 }
        }));
      } else {
        children.push(new Paragraph({ text: line, spacing: { after: config.paragraphAfter } }));
      }
    }
  }
  return children;
}

function buildLetterDocChildren(title, text, config, type = 'cover-letter') {
  const lines = normalizeLines(text);
  const children = [
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: title, bold: true, size: config.titleSize - 2, color: config.titleColor })]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({
        text: `${config.label} • ${config.layout === 'one-page' ? 'Compact ATS Layout' : 'Expanded ATS Layout'}`,
        italics: true,
        size: 18,
        color: config.contactColor
      })]
    })
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: '', spacing: { after: 90 } }));
      continue;
    }
    if (type === 'email' && /^subject:/i.test(trimmed)) {
      children.push(new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text: trimmed, bold: true, color: config.headingColor })]
      }));
      continue;
    }
    children.push(new Paragraph({ text: trimmed, spacing: { after: config.paragraphAfter + 10 } }));
  }
  return children;
}

async function writeDocx(filename, title, text, kind = 'resume', config) {
  const children = kind === 'resume'
    ? buildResumeDocChildren(title, text, config)
    : buildLetterDocChildren(title, text, config, kind === 'email' ? 'email' : 'cover-letter');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: config.theme === 'executive-clean' ? 'Aptos' : 'Calibri', size: config.bodySize, color: '1F2937' },
          paragraph: { spacing: { line: config.line } }
        }
      }
    },
    sections: [{
      properties: { page: { margin: config.margins } },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: title, italics: true, size: 16, color: config.contactColor })]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun(`JobNova Export • ${config.label} • `), PageNumber.CURRENT]
        })] })
      },
      children
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function writePdf(filename, title, text, kind = 'resume', config) {
  const filePath = path.join(GENERATED_DIR, filename);
  const doc = new PDFDocument({ margin: config.layout === 'one-page' ? 42 : 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.font('Helvetica-Bold').fontSize(config.layout === 'one-page' ? 18 : 20).fillColor(`#${config.titleColor}`).text(title);
  doc.moveDown(0.3);
  doc.font('Helvetica-Oblique').fontSize(9).fillColor(`#${config.contactColor}`).text(`${config.label} • ${config.layout === 'one-page' ? 'One-Page ATS Layout' : 'Two-Page ATS Layout'}`);
  doc.moveDown(0.3);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(545, doc.y).strokeColor(`#${config.accentColor}`).stroke();
  doc.moveDown(0.6);

  const sections = kind === 'resume' ? splitResumeSections(text) : [{ heading: '', lines: normalizeLines(text) }];
  for (const section of sections) {
    if (section.heading) {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(config.layout === 'one-page' ? 10.5 : 11.5).fillColor(`#${config.headingColor}`).text(section.heading);
      doc.moveDown(0.15);
    }
    for (const line of section.lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.2);
        continue;
      }
      if (/^[-•*]\s+/.test(trimmed)) {
        doc.font('Helvetica').fontSize(config.layout === 'one-page' ? 9.7 : 10.5).fillColor('#111827').text(`• ${trimmed.replace(/^[-•*]\s+/, '')}`, { indent: 8, paragraphGap: config.layout === 'one-page' ? 2 : 4 });
      } else if (kind === 'email' && /^subject:/i.test(trimmed)) {
        doc.font('Helvetica-Bold').fontSize(config.layout === 'one-page' ? 10 : 10.8).fillColor(`#${config.headingColor}`).text(trimmed, { paragraphGap: 5 });
      } else {
        doc.font('Helvetica').fontSize(config.layout === 'one-page' ? 9.7 : 10.5).fillColor('#111827').text(trimmed, { paragraphGap: config.layout === 'one-page' ? 2 : 4 });
      }
    }
  }

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

function writeTxt(filename, text) {
  const filePath = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(filePath, text);
  return filePath;
}

async function createPackageFiles({
  roleTitle,
  companyName,
  amendedResume,
  coverLetter,
  recruiterEmail,
  selectedExportFormat = 'both',
  selectedResumeExportFormat = selectedExportFormat,
  selectedCoverLetterExportFormat = selectedExportFormat,
  selectedRecruiterEmailExportFormat = selectedExportFormat,
  resumeThemeId = 'classic-canadian-professional',
  layoutMode = 'one-page'
}) {
  const base = `${Date.now()}-${slugify(roleTitle)}-${slugify(companyName || 'company')}`;
  const files = [];
  const normalizedEmail = recruiterEmail || `Subject: ${roleTitle} Application\n\nHello,\n\nPlease find my tailored application attached.`;
  const config = themeConfig(resumeThemeId, layoutMode);

  if (selectedResumeExportFormat === 'docx' || selectedResumeExportFormat === 'both') {
    files.push({ label: 'Resume DOCX', path: await writeDocx(`${base}-resume.docx`, `${roleTitle} Resume`, amendedResume, 'resume', config), type: 'resume', format: 'docx' });
  }
  if (selectedResumeExportFormat === 'pdf' || selectedResumeExportFormat === 'both') {
    files.push({ label: 'Resume PDF', path: await writePdf(`${base}-resume.pdf`, `${roleTitle} Resume`, amendedResume, 'resume', config), type: 'resume', format: 'pdf' });
  }
  if (selectedCoverLetterExportFormat === 'docx' || selectedCoverLetterExportFormat === 'both') {
    files.push({ label: 'Cover Letter DOCX', path: await writeDocx(`${base}-cover-letter.docx`, `${roleTitle} Cover Letter`, coverLetter, 'cover-letter', config), type: 'cover-letter', format: 'docx' });
  }
  if (selectedCoverLetterExportFormat === 'pdf' || selectedCoverLetterExportFormat === 'both') {
    files.push({ label: 'Cover Letter PDF', path: await writePdf(`${base}-cover-letter.pdf`, `${roleTitle} Cover Letter`, coverLetter, 'cover-letter', config), type: 'cover-letter', format: 'pdf' });
  }
  if (selectedRecruiterEmailExportFormat === 'docx' || selectedRecruiterEmailExportFormat === 'both') {
    files.push({ label: 'Recruiter Email DOCX', path: await writeDocx(`${base}-recruiter-email.docx`, `${roleTitle} Recruiter Email`, normalizedEmail, 'email', config), type: 'recruiter-email', format: 'docx' });
  }
  if (selectedRecruiterEmailExportFormat === 'pdf' || selectedRecruiterEmailExportFormat === 'both') {
    files.push({ label: 'Recruiter Email PDF', path: await writePdf(`${base}-recruiter-email.pdf`, `${roleTitle} Recruiter Email`, normalizedEmail, 'email', config), type: 'recruiter-email', format: 'pdf' });
  }
  files.push({ label: 'Recruiter Email TXT', path: writeTxt(`${base}-recruiter-email.txt`, normalizedEmail), type: 'recruiter-email', format: 'txt' });
  return files.map((file) => ({
    label: file.label,
    type: file.type,
    format: file.format,
    fileName: path.basename(file.path)
  }));
}

module.exports = { createPackageFiles, GENERATED_DIR };
