import {test,expect} from '@playwright/test';
const base='https://agentsphere-zeta.vercel.app';
test.beforeEach(async({page})=>{await page.goto(base+'/auth/login');await page.getByRole('button',{name:/Owner/}).click();await expect(page).toHaveURL(/dashboard/,{timeout:90000});});
test('agent create, edit, duplicate and archive forms persist through API',async({page})=>{
 const name='Browser QA agent '+Date.now(),edited=name+' edited';
 await page.goto(base+'/agents');await page.getByRole('button',{name:'Create New Agent'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'Agent Name',exact:true}).fill(name);await dialog.getByRole('textbox',{name:'System Instructions & Behavior Prompt',exact:true}).fill('Answer accurately using the available references.');await dialog.getByRole('button',{name:'Save Agent'}).click();
 await expect(page.getByRole('heading',{name,exact:true})).toBeVisible({timeout:30000});
 const card=(title:string)=>page.locator('div.glass-panel').filter({has:page.getByRole('heading',{name:title,exact:true})});
 await card(name).getByTitle('Edit Agent').click();await dialog.getByRole('textbox',{name:'Agent Name',exact:true}).fill(edited);await dialog.getByRole('button',{name:'Save Agent'}).click();await expect(page.getByRole('heading',{name:edited,exact:true})).toBeVisible({timeout:30000});
 await card(edited).getByTitle('Duplicate Agent').click();await expect(page.getByRole('heading',{name:edited+' (Copy)',exact:true})).toBeVisible({timeout:30000});
 await card(edited+' (Copy)').getByTitle('Delete Agent').click();await expect(page.getByRole('heading',{name:edited+' (Copy)',exact:true})).toHaveCount(0);
 await card(edited).getByTitle('Delete Agent').click();await expect(page.getByRole('heading',{name:edited,exact:true})).toHaveCount(0);
});
test('knowledge upload, retrieval, reindex and delete controls work',async({page})=>{
 const marker='BROWSERQA'+Date.now(),filename=marker+'.txt';await page.goto(base+'/knowledge');
 const uploaded=page.waitForResponse(r=>r.url().includes('/documents/upload')&&r.request().method()==='POST');await page.locator('input[type=file]').setInputFiles({name:filename,mimeType:'text/plain',buffer:Buffer.from('The verification reference is '+marker+'. Approval threshold is 5000 USD.')});expect((await uploaded).status()).toBe(201);
 const row=page.locator('tr').filter({hasText:filename});await expect(row).toContainText('INDEXED',{timeout:30000});
 await page.getByPlaceholder('Search policy, rate cards, limits, security...').fill(marker);const searched=page.waitForResponse(r=>r.url().includes('/documents/search')&&r.request().method()==='POST');await page.getByRole('button',{name:'Search',exact:true}).click();expect((await searched).status()).toBe(200);await expect(page.getByText(/Match #1/)).toBeVisible();
 const reindexed=page.waitForResponse(r=>r.url().endsWith('/reindex'));await row.getByTitle('Re-index Document').click();expect((await reindexed).status()).toBe(200);
 const removed=page.waitForResponse(r=>r.url().includes('/documents/')&&r.request().method()==='DELETE');await row.getByTitle('Delete Document').click();expect((await removed).status()).toBe(200);await expect(row).toHaveCount(0);
});
test('workflow builder saves and runs a real tool pipeline',async({page})=>{
 await page.goto(base+'/workflows');await expect(page.locator('.react-flow__node').first()).toBeVisible({timeout:30000});
 await page.getByLabel('Workflow name',{exact:true}).fill('Browser QA workflow '+Date.now());
 const created=page.waitForResponse(r=>r.url().endsWith('/workflows')&&r.request().method()==='POST');await page.getByRole('button',{name:'New workflow',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const workflow=await response.json();await expect(page.getByLabel('Active workflow')).toHaveValue(workflow.id,{timeout:30000});await expect(page.locator('.react-flow__node')).toHaveCount(2);
 await page.getByRole('button',{name:'Add Tool',exact:true}).click();await expect(page.locator('.react-flow__node')).toHaveCount(3);
 await page.getByLabel('Workflow tool arguments').fill('{"expression":"12 * 7"}');await page.getByLabel('Step label').click();
 const saved=page.waitForResponse(r=>r.url().endsWith('/workflows/'+workflow.id)&&r.request().method()==='PUT');await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200);
 const queued=page.waitForResponse(r=>r.url().endsWith('/workflows/'+workflow.id+'/run')&&r.request().method()==='POST');await page.getByRole('button',{name:'Execute Workflow',exact:true}).click();const execution=await (await queued).json();await expect(page.getByText('COMPLETED',{exact:true})).toBeVisible({timeout:90000});
 const result=await page.evaluate(async(id)=>{const response=await fetch('/api/backend/executions/'+id,{headers:{Authorization:'Bearer '+localStorage.getItem('agentsphere_token')}});return response.json();},execution.id);expect(result.output.toolResult.result).toBe(84);
 const executionResponse=await page.request.get('https://agentsphere-api-nitinsharma.onrender.com/health');expect(executionResponse.status()).toBe(200);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete workflow',exact:true}).click();await expect(page.getByLabel('Active workflow')).not.toHaveValue(workflow.id,{timeout:30000});
});

test('prompt release editor saves and publishes through the UI',async({page})=>{
 const title='Browser QA prompt '+Date.now();await page.goto(base+'/prompts');await page.getByRole('button',{name:'New Prompt Version',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Version Title',{exact:true}).fill(title);await dialog.getByLabel('Prompt Template Text',{exact:true}).fill('Provide a concise verification response.');await dialog.getByLabel('Change Summary / Governance Notes',{exact:true}).fill('Synthetic live browser verification');
 const created=page.waitForResponse(r=>r.url().endsWith('/prompts')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'Save Version',exact:true}).click();expect((await created).status()).toBe(201);
 await page.getByRole('button').filter({hasText:title}).click();const published=page.waitForResponse(r=>r.url().includes('/prompts/')&&r.url().endsWith('/publish'));await page.getByRole('button',{name:'Rollback / Publish',exact:true}).click();expect((await published).status()).toBe(200);await expect(page.getByText('Active In Production',{exact:true})).toBeVisible();
});
