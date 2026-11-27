from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing,Rect,String,Line
VIOLET=colors.HexColor('#7C3AED')
def build_pdf():
    styles=getSampleStyleSheet();styles['Title'].textColor=VIOLET;styles['Heading1'].textColor=VIOLET;styles['Heading2'].textColor=VIOLET
    styles.add(ParagraphStyle(name='SmallEvidence',parent=styles['BodyText'],fontSize=8,leading=11))
    story=[Paragraph('AgentSphere',styles['Title']),Paragraph('Implementation, deployment and verification report',styles['Heading2']),Paragraph('27 November 2026 | Evidence-based assessment review',styles['BodyText']),Spacer(1,14)]
    for label,url in [('GitHub','https://github.com/nitinsharma2005900-ai/AgentSphere'),('Live frontend','https://agentsphere-zeta.vercel.app'),('Backend','https://agentsphere-api-nitinsharma.onrender.com')]:
        story.append(Paragraph(f'{label}: <link href="{url}" color="#7C3AED">{url}</link>',styles['BodyText']))
    story.extend([Spacer(1,14),Paragraph('Verified evidence',styles['Heading1'])])
    rows=[['Check','Result'],['Backend tests','29 passed'],['Python tests','21 passed'],['Deployed API journey','13 / 13 checks passed'],['Browser journey','Passed: login, navigation, dialogs, tool, CSV, mobile'],['Production dependency audits','0 vulnerabilities: frontend and backend'],['PostgreSQL backup / restore','15 tables restored in isolated schema; rolled back'],['Real AI','Gemini inference and RAG verified; no mock used']]
    table=Table(rows,colWidths=[170,340]);table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),VIOLET),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#DDD6FE')),('FONTSIZE',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),8)]));story.extend([table,Spacer(1,12)])
    story.append(Paragraph('Architecture',styles['Heading1']))
    drawing=Drawing(510,120)
    boxes=[(0,60,'Next.js / Vercel'),(180,60,'Express / Render'),(360,60,'Neon PostgreSQL'),(180,0,'Worker + Redis'),(360,0,'FastAPI -> Gemini')]
    for x,y,label in boxes:
        drawing.add(Rect(x,y,150,42,rx=8,ry=8,fillColor=colors.HexColor('#F5F3FF'),strokeColor=VIOLET));drawing.add(String(x+8,y+18,label,fontName='Helvetica',fontSize=10))
    for x1,y1,x2,y2 in [(150,81,180,81),(330,81,360,81),(255,60,255,42),(330,21,360,21)]:drawing.add(Line(x1,y1,x2,y2,strokeColor=VIOLET,strokeWidth=1.5))
    story.extend([drawing,Paragraph('The API, inference gateway, worker and Redis share a free Render container. Neon owns durable records and derived vectors. This is a deliberate free-hosting tradeoff.',styles['BodyText']),PageBreak(),Paragraph('All 15 assessments: actual status',styles['Heading1'])])
    matrix=json.loads(Path('docs/results/assessment-status.json').read_text(encoding='utf-8'))
    rows=[[Paragraph('Assessment',styles['SmallEvidence']),Paragraph('Status and evidence',styles['SmallEvidence'])]]
    for item in matrix['assessments']:
        rows.append([Paragraph(escape(item['id']+' '+item['assessment']),styles['SmallEvidence']),Paragraph('<b>'+escape(item['status'])+'</b><br/>'+escape(item['evidence']),styles['SmallEvidence'])])
    table=Table(rows,colWidths=[145,365],repeatRows=1);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#DDD6FE')),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EDE9FE')),('BOTTOMPADDING',(0,0),(-1,-1),9)]));story.extend([table,PageBreak()])
    in_code=False
    for line in Path('README.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('```'):in_code=not in_code;continue
        if in_code:continue
        if not line.strip():story.append(Spacer(1,7));continue
        style=styles['Heading1'] if line.startswith('# ') else styles['Heading2'] if line.startswith('## ') else styles['BodyText']
        story.append(Paragraph(escape(line.lstrip('# ')),style))
    def footer(canvas,doc):canvas.setFont('Helvetica',8);canvas.setFillColor(VIOLET);canvas.drawString(42,24,'AgentSphere | Verified implementation report');canvas.drawRightString(555,24,str(doc.page))
    SimpleDocTemplate('AgentSphere_Project_Documentation.pdf',rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=42).build(story,onFirstPage=footer,onLaterPages=footer)
if __name__=='__main__':build_pdf()
