from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
from reportlab.lib.styles import getSampleStyleSheet

def build_pdf():
    styles=getSampleStyleSheet(); story=[]
    for line in Path('README.md').read_text(encoding='utf-8').splitlines():
        if not line.strip():story.append(Spacer(1,8));continue
        style=styles['Heading1'] if line.startswith('# ') else styles['Heading2'] if line.startswith('## ') else styles['BodyText']
        story.append(Paragraph(escape(line.lstrip('# ')),style))
    SimpleDocTemplate('AgentSphere_Project_Documentation.pdf').build(story)
if __name__=='__main__':build_pdf()
