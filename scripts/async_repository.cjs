const { Project, SyntaxKind, Node } = require('../frontend/node_modules/ts-morph');
const project = new Project({tsConfigFilePath:'backend/tsconfig.json'});
for(const file of project.getSourceFiles()) {
  if(!/\/(routes|services)\//.test(file.getFilePath())) continue;
  const calls=file.getDescendantsOfKind(SyntaxKind.CallExpression).filter(n=>/^db\./.test(n.getExpression().getText())).reverse();
  for(const call of calls) {
    const fn=call.getFirstAncestor(n=>Node.isArrowFunction(n)||Node.isFunctionDeclaration(n)||Node.isMethodDeclaration(n));
    if(fn) fn.setIsAsync(true);
    if(call.getParent().getKind()!==SyntaxKind.AwaitExpression) call.replaceWithText('(await '+call.getText()+')');
  }
}
project.saveSync();
