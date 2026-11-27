const {Project,SyntaxKind}=require('../frontend/node_modules/ts-morph');
const project=new Project({tsConfigFilePath:'frontend/tsconfig.json'});
for(const file of project.getSourceFiles()){
 if(!file.getFilePath().includes('/src/'))continue;
 const text=file.getFullText();
 const inputs=file.getDescendants().filter(n=>[SyntaxKind.JsxSelfClosingElement,SyntaxKind.JsxOpeningElement].includes(n.getKind())&&['input','textarea','select'].includes(n.getTagNameNode().getText())).reverse();
 for(const input of inputs){
  if(input.getAttribute('aria-label')||input.getAttribute('aria-labelledby')||input.getAttribute('id'))continue;
  const before=text.slice(Math.max(0,input.getStart()-1300),input.getStart()),labels=[...before.matchAll(/<label\b[^>]*>([^<{}]+)<\/label>/g)];
  const label=labels.length?labels[labels.length-1][1].trim():input.getAttribute('placeholder')?.getInitializer()?.getText().replace(/^['"]|['"]$/g,'')||'Field';
  input.addAttribute({name:'aria-label',initializer:JSON.stringify(label)});
 }
 const dialogs=file.getDescendantsOfKind(SyntaxKind.JsxElement).filter(n=>n.getOpeningElement().getTagNameNode().getText()==='div'&&n.getOpeningElement().getAttribute('className')?.getText().includes('fixed inset-0')).reverse();
 let imported=false;
 for(const dialog of dialogs){
  const name=file.getBaseName(),path=file.getFilePath();let close='';
  if(path.includes('/agents/'))close=dialog.getText().includes('handleSave')?'setIsEditing(false)':'setShowPlayground(false)';
  else if(path.includes('/prompts/'))close='setShowNewModal(false)';
  else if(path.includes('/tools/'))close='setTestingTool(null)';
  else if(path.includes('/auth/login/'))close='setShowForgotModal(false)';
  if(!close)continue;
  dialog.getOpeningElement().getTagNameNode().replaceWithText('Dialog');dialog.getClosingElement().getTagNameNode().replaceWithText('Dialog');
  dialog.getOpeningElement().addAttributes([{name:'onClose',initializer:'{()=>'+close+'}'},{name:'label',initializer:JSON.stringify(path.includes('/agents/')?'Agent dialog':path.includes('/prompts/')?'New prompt release':path.includes('/tools/')?'Test tool':'Account recovery')}]);imported=true;
 }
 if(imported)file.addImportDeclaration({namedImports:['Dialog'],moduleSpecifier:file.getFilePath().includes('/auth/')?'../../../components/Feedback':'../../components/Feedback'});
}
project.saveSync();
