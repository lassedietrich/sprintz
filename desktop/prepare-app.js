// Übernimmt die Web-App (index.html und Icons) aus dem Repo in die Desktop-App.
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..'), app=path.join(__dirname,'app'), build=path.join(__dirname,'build');
fs.mkdirSync(app,{recursive:true}); fs.mkdirSync(build,{recursive:true});
for(const f of ['index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png']) if(fs.existsSync(path.join(root,f))) fs.copyFileSync(path.join(root,f), path.join(app,f));
fs.copyFileSync(path.join(root,'icon-512.png'), path.join(build,'icon.png'));
console.log('Web-App übernommen:', fs.readdirSync(app).join(', '));
