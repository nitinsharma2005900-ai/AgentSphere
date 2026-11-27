import {test,expect} from '@playwright/test';
test('deployed workspace navigation, dialogs, export, and mobile controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('https://agentsphere-zeta.vercel.app/auth/login');
 await page.getByRole('button',{name:/Owner/}).click();
 await expect(page).toHaveURL(/dashboard/,{timeout:90000});
 await expect(page.locator('main h1').first()).toBeVisible();
 for(const path of ['agents','knowledge','prompts','approvals','executions','tools','billing','admin','workflows']){
  await page.goto('https://agentsphere-zeta.vercel.app/'+path);
  await expect(page.locator('main h1').first()).toBeVisible({timeout:30000});
 }
 await page.goto('https://agentsphere-zeta.vercel.app/agents');
 await page.getByTitle('Edit Agent').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('https://agentsphere-zeta.vercel.app/tools');await page.getByRole('button',{name:'Test Tool',exact:true}).first().click();await page.getByRole('button',{name:'Run Test Execution'}).click();await expect(page.getByRole('dialog')).toContainText('SUCCESS',{timeout:30000});await page.keyboard.press('Escape');
 await page.goto('https://agentsphere-zeta.vercel.app/billing');const download=page.waitForEvent('download');await page.getByRole('button',{name:/Download Usage Report/}).click();expect((await download).suggestedFilename()).toContain('.csv');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('link',{name:'AI Agent Studio'})).toBeVisible();await page.getByRole('link',{name:'AI Agent Studio'}).click();await expect(page).toHaveURL(/agents/);await page.screenshot({path:'../docs/results/mobile-agents.png',fullPage:true});
 expect(errors).toEqual([]);
});
