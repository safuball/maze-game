const START={x:1,y:1};
const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
// 全ての奇数座標の部屋をつなぐ。外周は掘らず、必ず壁として残す。
function selectSpacedConnections(candidates,limit){
 const selected=[];
 for(const candidate of candidates){
  if(selected.length>=limit)break;
  if(selected.every(p=>(p.x-candidate.x)**2+(p.y-candidate.y)**2>=25))selected.push(candidate);
 }
 return selected;
}
function createWallAreas(size,rooms){
 const width=size<21?3:5,candidates=[],areas=[];
 for(let y=2;y+width<size-2;y+=2)for(let x=2;x+width<size-2;x+=2){
  if(rooms.every(r=>x+width<r.x||r.x+r.width<x||y+width<r.y||r.y+r.height<y))candidates.push({x,y,width,height:width});
 }
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 for(const area of candidates){
  if(areas.length>=Math.min(8,Math.ceil(size/15)))break;
  if(areas.every(r=>area.x+width+2<=r.x||r.x+r.width+2<=area.x||area.y+width+2<=r.y||r.y+r.height+2<=area.y))areas.push(area);
 }
 return areas;
}
function generateMaze(size=21,loopDensity=.10,rooms=[]){
 const grid=Array.from({length:size},()=>Array(size).fill(1));
 const solidAreas=createWallAreas(size,rooms);
 const reserved=Array.from({length:size},()=>Array(size).fill(false));
 for(const area of solidAreas)for(let y=area.y;y<area.y+area.height;y++)for(let x=area.x;x<area.x+area.width;x++)reserved[y][x]=true;
 grid.solidAreas=solidAreas;
 grid[1][1]=0; const stack=[{...START}];
 while(stack.length){
  const p=stack[stack.length-1];
  const choices=Object.values(directions).map(([dx,dy])=>({x:p.x+dx*2,y:p.y+dy*2,dx,dy})).filter(q=>q.x>0&&q.y>0&&q.x<size-1&&q.y<size-1&&grid[q.y][q.x]===1&&!reserved[q.y][q.x]&&!reserved[p.y+q.dy][p.x+q.dx]);
  if(!choices.length){stack.pop();continue;}
  const q=choices[Math.floor(Math.random()*choices.length)];
  grid[p.y+q.dy][p.x+q.dx]=0;grid[q.y][q.x]=0;stack.push(q);
 }
 // 通路の間の壁を追加で開け、間隔を空けて枝分かれと周回路を作る。
 // 偶数×偶数の柱は残すので、大部屋以外は細い通路を維持できる。
 const connections=[];
 const degree=(x,y)=>Object.values(directions).filter(([dx,dy])=>grid[y+dy]?.[x+dx]===0).length;
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
  if(grid[y][x]!==1||reserved[y][x])continue;
  let endpoints;
  if(x%2===0&&y%2===1&&grid[y][x-1]===0&&grid[y][x+1]===0)endpoints=[[x-1,y],[x+1,y]];
  if(x%2===1&&y%2===0&&grid[y-1][x]===0&&grid[y+1][x]===0)endpoints=[[x,y-1],[x,y+1]];
  if(endpoints)connections.push({x,y,priority:endpoints.some(([px,py])=>degree(px,py)===1)?1:0,random:Math.random()});
 }
 connections.sort((a,b)=>b.priority-a.priority||a.random-b.random);
 const roomCount=Math.ceil((size-2)/2)**2;
 const extraConnections=Math.min(connections.length,Math.max(1,Math.floor(roomCount*loopDensity)));
 for(const {x,y} of selectSpacedConnections(connections,extraConnections))grid[y][x]=0;
 return grid;
}
// 5×5の大部屋。部屋の間に少なくとも3マスの迷路区間を残す。
function roomsApart(a,b){
 return a.x+7<b.x || b.x+7<a.x || a.y+7<b.y || b.y+7<a.y;
}
function generateLayout(size,challengeStage=0){

 const count=challengeStage?Math.min(8,2+Math.floor(challengeStage/2)+Math.floor(Math.random()*2)):size===13?0:size===21?1+Math.floor(Math.random()*2):size===50?5:3;
 const minDistance=challengeStage?Math.floor(size*.65):size===50?42:size===31?26:14;
 const candidates=[];
 for(let y=1;y+4<size-1;y+=2) for(let x=1;x+4<size-1;x+=2){
  // 部屋の最も近いマスでもスタートから十分離れる。
  if(x+y-2>=minDistance)candidates.push({x,y,width:5,height:5});
 }
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const rooms=[];
 function choose(from){
  if(rooms.length===count)return true;
  for(let i=from;i<candidates.length;i++){
   const room=candidates[i];
   if(!rooms.every(other=>roomsApart(room,other)))continue;
   rooms.push(room);if(choose(i+1))return true;rooms.pop();
  }
  return false;
 }
 if(!choose(0))throw new Error('大部屋を配置できませんでした');
 const grid=generateMaze(size,challengeStage?Math.min(.14,.10+(challengeStage-1)*.005):size===13?.08:.10,rooms);
 for(const room of rooms)for(let y=room.y;y<room.y+5;y++)for(let x=room.x;x<room.x+5;x++)grid[y][x]=0;
 let goal={x:size-2,y:size-2};
 if(rooms.length){const room=rooms[Math.floor(Math.random()*rooms.length)];goal={x:room.x+2,y:room.y+2};}
 const otherRooms=rooms.filter(room=>room.x+2!==goal.x||room.y+2!==goal.y);
 // 鬼レベルではゴールのない部屋を1つ残し、残りを偽ゴール部屋にする。
 const emptyRooms=(size===50||challengeStage&&rooms.length>=4)?[otherRooms[Math.floor(Math.random()*otherRooms.length)]]:[];
 const fakeGoals=otherRooms.filter(room=>!emptyRooms.includes(room)).map(room=>({x:room.x+2,y:room.y+2}));
 return {grid,rooms,goal,fakeGoals,emptyRooms,solidAreas:grid.solidAreas};
}
function cameraFor(size,point,viewSize=20){
 return {x:Math.max(0,Math.min(size-viewSize,point.x+.5-viewSize/2)),y:Math.max(0,Math.min(size-viewSize,point.y+.5-viewSize/2)),viewSize};
}
function canMove(grid,x,y){return x>=0&&y>=0&&x<grid.length&&y<grid.length&&grid[y][x]===0;}
function revealAround(explored,player){
 for(let y=Math.max(0,player.y-1);y<=Math.min(explored.length-1,player.y+1);y++)
  for(let x=Math.max(0,player.x-1);x<=Math.min(explored.length-1,player.x+1);x++) explored[y][x]=true;
}
function placeLargeDetector(grid,rooms,size,challengeStage=0){
 if(!challengeStage&&size!==31&&size!==50)return [];
 const candidates=[];
 for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(grid[y][x]===0&&x+y>8&&!rooms.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height))candidates.push({x,y});
 const count=challengeStage?Math.min(10,3+Math.floor(challengeStage/2)):size===31?3:6;
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 return candidates.slice(0,count);
}
function unrevealedRooms(rooms,explored){
 return rooms.filter(room=>{
  for(let y=room.y;y<room.y+room.height;y++)for(let x=room.x;x<room.x+room.width;x++)if(!explored[y][x])return true;
  return false;
 });
}
function revealRoom(explored,room){
 for(let y=room.y;y<room.y+room.height;y++)for(let x=room.x;x<room.x+room.width;x++)explored[y][x]=true;
}
// 本物のゴールから距離を計算。未消滅の偽ゴールを避けて案内する。
function goalDistances(grid,goal,fakeGoals){
 const distances=grid.map(row=>row.map(()=>-1)),queue=[goal];
 const traps=new Set(fakeGoals.map(p=>p.x+','+p.y));distances[goal.y][goal.x]=0;
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of Object.values(directions)){
  const x=queue[i].x+dx,y=queue[i].y+dy;
  if(canMove(grid,x,y)&&distances[y][x]===-1&&!traps.has(x+','+y)){distances[y][x]=distances[queue[i].y][queue[i].x]+1;queue.push({x,y});}
 }
 return distances;
}
if(typeof document!=='undefined'){
 const canvas=document.getElementById('maze'),ctx=canvas.getContext('2d'),status=document.getElementById('status');
 const miniMap=document.getElementById('mini-map'),miniContext=miniMap.getContext('2d'),miniPanel=document.getElementById('mini-panel');
 const mapDialog=document.getElementById('map-dialog'),fullMap=document.getElementById('full-map'),fullContext=fullMap.getContext('2d');
 function openFullMap(){if(!isZoomed())return;clearInput();mapDialog.showModal();draw();}
 const isZoomed=()=>!isChallenge()&&(size===31||size===50);
 function displayPosition(){
  const progress=motion?Math.min(1,(performance.now()-motion.started)/WALK_DURATION):1;
  return motion?{x:motion.from.x+(player.x-motion.from.x)*progress,y:motion.from.y+(player.y-motion.from.y)*progress}:player;
 }
 function drawMiniMap(camera){
  miniPanel.hidden=!isZoomed();if(!isZoomed())return;
  renderOverview(miniContext,miniMap,camera);
  if(mapDialog.open)renderOverview(fullContext,fullMap,camera);
 }
 function renderOverview(brush,mapCanvas,camera){
  const scale=mapCanvas.width/size;
  brush.drawImage(terrain,0,0,mapCanvas.width,mapCanvas.height);
  if(isExplorationMode()){
   brush.fillStyle='#080e19';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!isVisible(x,y))brush.fillRect(Math.floor(x*scale),Math.floor(y*scale),Math.ceil(scale)+1,Math.ceil(scale)+1);
  }
  for(const [p,color] of [[START,'#42b87b'],[goal,'#f7c34a'],...fakeGoals.map(p=>[p,'#d3a43d']),...largePickups.map(p=>[p,'#bcefff'])]){
   if(isExplorationMode()&&!isVisible(p.x,p.y))continue;
   brush.fillStyle=color;brush.fillRect(p.x*scale,p.y*scale,scale,scale);
  }
  brush.strokeStyle='#71dfff';brush.lineWidth=1;brush.strokeRect(camera.x*scale,camera.y*scale,camera.viewSize*scale,camera.viewSize*scale);
  const position=displayPosition();brush.fillStyle='#65ddff';brush.beginPath();brush.arc((position.x+.5)*scale,(position.y+.5)*scale,Math.max(2,scale*.4),0,Math.PI*2);brush.fill();
 }
 const difficulty=document.getElementById("difficulty");
 const exploration=document.getElementById("exploration");
 const detectorButton=document.getElementById('room-detector'),itemStatus=document.getElementById('item-status');
 const largeButton=document.getElementById('large-detector'),scanStatus=document.getElementById('scan-status');
 const goalButton=document.getElementById('goal-detector'),guideStatus=document.getElementById('guide-status');
 let goalUses=1,goalUntil=0,guideDistances=null;
 function guidanceAt(point){
  if(!guideDistances||guideDistances[point.y][point.x]<=0)return null;
  for(const [direction,[dx,dy]] of Object.entries(directions)){
   const x=point.x+dx,y=point.y+dy;
   if(canMove(grid,x,y)&&guideDistances[y][x]>=0&&guideDistances[y][x]<guideDistances[point.y][point.x])return {x,y,direction};
  }
  return null;
 }
 function useGoalDetector(){
  if(expireChallenge()||!isExplorationMode()||goalUses===0||won||motion||trapEffect||performance.now()<goalUntil)return;
  goalUses--;goalUntil=performance.now()+10000;guideDistances=goalDistances(grid,goal,fakeGoals);
  itemStatus.textContent='ゴール探知機を使用！ 本物のゴールへ10秒間案内します。';draw();
  if(animationFrame===null)animationFrame=requestAnimationFrame(animate);
 }
 function drawGoalGuide(){
  if(performance.now()>=goalUntil||won)return;
  ctx.save();ctx.fillStyle='#fff6b2';ctx.strokeStyle='#70512a';ctx.lineWidth=2;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.floor(cell*.8)+'px system-ui';
  let point=player;
  for(let i=0;i<6;i++){
   const next=guidanceAt(point);if(!next||!isVisible(next.x,next.y))break;
   const arrow={up:'↑',down:'↓',left:'←',right:'→'}[next.direction];
   if(next.x!==goal.x||next.y!==goal.y){ctx.strokeText(arrow,(next.x+.5)*cell,(next.y+.5)*cell);ctx.fillText(arrow,(next.x+.5)*cell,(next.y+.5)*cell);}
   point=next;
  }
  ctx.restore();
 }
 const isChallenge=()=>exploration.value==='challenge';
 const isExplorationMode=()=>exploration.value!=='normal';
 const challengeStatus=document.getElementById('challenge-status');
 let stage=1,challengeDeadline=0,timeOver=false;
 function expireChallenge(){
  if(!isChallenge()||timeOver||performance.now()<challengeDeadline)return false;
  timeOver=true;won=true;clearInput();motion=null;trapEffect=null;goalEffect=null;scanUntil=0;goalUntil=0;
  status.textContent='時間切れ！ ステージ'+stage+'到達・'+(stage-1)+'ステージクリア';return true;
 }
 function updateChallenge(){
  difficulty.disabled=isChallenge();document.getElementById('reset').textContent=isChallenge()?'10分チャレンジをやり直す':'新しい迷路';
  challengeStatus.textContent=isChallenge()?'ステージ '+stage+' ｜ '+size+'×'+size+' ｜ 残り '+Math.floor(Math.max(0,Math.ceil((challengeDeadline-performance.now())/1000))/60)+':'+String(Math.max(0,Math.ceil((challengeDeadline-performance.now())/1000))%60).padStart(2,'0'):'';
 }
 let rooms,detectorUses=1,largePickups=[],largeUses=0,scanUntil=0;
 function isVisible(x,y){return explored[y][x]||(performance.now()<scanUntil&&Math.abs(x-player.x)<=3&&Math.abs(y-player.y)<=3);}
 function useLargeDetector(){
  if(expireChallenge()||!isExplorationMode()||largeUses===0||won||motion||trapEffect||performance.now()<scanUntil)return;
  largeUses--;scanUntil=performance.now()+10000;
  itemStatus.textContent='大型探知君を使用！ 10秒間、周囲7×7を照らします。';
  draw();if(animationFrame===null)animationFrame=requestAnimationFrame(animate);
 }
 let grid,player,steps,won,size,goal,cell,explored,terrain,fakeGoals;
 let facing='down',motion=null,animationFrame=null,trapEffect=null,goalEffect=null;
 const WALK_DURATION=125;
 const heldInputs=new Map();let pendingDirection=null;
 function clearInput(){heldInputs.clear();pendingDirection=null;}
 function requestMovement(dir){
  if(mapDialog.open||expireChallenge()||won||trapEffect)return;
  if(motion)pendingDirection=dir;else move(dir);
  if(animationFrame===null)animationFrame=requestAnimationFrame(animate);
 }
 function drawPlayer(){
  const progress=motion?Math.min(1,(performance.now()-motion.started)/WALK_DURATION):1;
  const x=motion?motion.from.x+(player.x-motion.from.x)*progress:player.x;
  const y=motion?motion.from.y+(player.y-motion.from.y)*progress:player.y;
  const shake=trapEffect&&!trapEffect.warped?Math.sin((performance.now()-trapEffect.started)*.065)*cell*.09:0;
  const bounce=goalEffect&&performance.now()-goalEffect.started<2400?Math.abs(Math.sin((performance.now()-goalEffect.started)/160))*cell*.15:0;
  ctx.save();ctx.translate((x+.5)*cell+shake,(y+.5)*cell-bounce);ctx.scale(cell,cell);
  if(trapEffect&&!trapEffect.warped)ctx.globalAlpha=1-.65*Math.min(1,(performance.now()-trapEffect.started)/650);
  ctx.fillStyle='#08394c';ctx.beginPath();ctx.arc(0,0,.40,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#65ddff';ctx.strokeStyle='#f0fcff';ctx.lineWidth=.055;ctx.beginPath();ctx.arc(0,0,.32,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.rotate({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[facing]);
  ctx.fillStyle='#075b80';ctx.beginPath();ctx.moveTo(0,-.22);ctx.lineTo(.16,.13);ctx.lineTo(0,.065);ctx.lineTo(-.16,.13);ctx.closePath();ctx.fill();ctx.restore();
 }
 function resolveLanding(){
  if(player.x===goal.x&&player.y===goal.y){
   won=true;clearInput();scanUntil=0;goalUntil=0;facing='down';
   goalEffect={started:performance.now(),confetti:Array.from({length:75},()=>({x:Math.random()*canvas.width,y:-Math.random()*canvas.height,speed:100+Math.random()*160,spin:Math.random()*Math.PI*2,color:['#ffd45e','#7ae4b0','#86c9ff','#ff97ba','#f3eeff'][Math.floor(Math.random()*5)]}))};
   status.textContent='ゴール！ '+steps+'歩でクリア 🎉';return;
  }
  const pickupIndex=largePickups.findIndex(p=>p.x===player.x&&p.y===player.y);
  if(pickupIndex>=0){
   largePickups.splice(pickupIndex,1);largeUses++;itemStatus.textContent='大型探知君を拾いました！ 所持'+largeUses+'個。';
  }
  const index=fakeGoals.findIndex(p=>p.x===player.x&&p.y===player.y);
  if(index<0)return;
  fakeGoals.splice(index,1);clearInput();
  trapEffect={started:performance.now(),point:{...player},warped:false};
  status.textContent='偽ゴールを踏んだ！ スタートへワープします…';
 }
 function drawTrapEffect(){
  if(!trapEffect)return;
  const elapsed=performance.now()-trapEffect.started;
  const point=trapEffect.warped?START:trapEffect.point;
  ctx.save();ctx.strokeStyle=trapEffect.warped?'#a8d9ff':'#ff7777';ctx.lineWidth=3;
  for(let i=0;i<2;i++){
   const progress=((elapsed+i*220)%650)/650;
   ctx.globalAlpha=1-progress;ctx.beginPath();ctx.arc((point.x+.5)*cell,(point.y+.5)*cell,cell*(.4+progress*1.5),0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
 }
 function drawTrapBanner(){
  if(!trapEffect)return;ctx.save();
  ctx.globalAlpha=1;
  ctx.fillStyle=trapEffect.warped?'#173d58':'#632d30';ctx.fillRect(35,20,canvas.width-70,76);
  ctx.strokeStyle=trapEffect.warped?'#a8d9ff':'#ff9999';ctx.strokeRect(35,20,canvas.width-70,76);
  ctx.fillStyle='#fff3df';ctx.font='bold 28px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(trapEffect.warped?'スタートへワープ！':'偽ゴールを踏んだ！',canvas.width/2,58);
  ctx.restore();
 }
 function drawGoalEffect(){
  if(!goalEffect)return;
  const elapsed=performance.now()-goalEffect.started;
  ctx.save();
  if(elapsed<3000)for(const piece of goalEffect.confetti){
   ctx.save();ctx.translate(piece.x+Math.sin(elapsed/300+piece.spin)*20,piece.y+elapsed/1000*piece.speed);ctx.rotate(piece.spin+elapsed/350);
   ctx.globalAlpha=Math.min(1,(3000-elapsed)/500);ctx.fillStyle=piece.color;ctx.fillRect(-4,-7,8,14);ctx.restore();
  }
  ctx.globalAlpha=1;ctx.fillStyle='#173e35';ctx.fillRect(55,25,canvas.width-110,110);
  ctx.strokeStyle='#f7d770';ctx.lineWidth=3;ctx.strokeRect(55,25,canvas.width-110,110);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffe797';ctx.font='bold 36px system-ui';ctx.fillText('ゴール！',canvas.width/2,65);
  ctx.fillStyle='#ecfff6';ctx.font='20px system-ui';ctx.fillText(isChallenge()?'ステージ'+stage+'クリア！ 次の迷路へ…':steps+'歩でクリア！ 新しい迷路に挑戦しよう',canvas.width/2,108);
  ctx.restore();
 }
 function animate(){
  animationFrame=null;
  const now=performance.now();
  if(expireChallenge()){draw();return;}
  if(isChallenge()&&goalEffect&&now-goalEffect.started>=1000){stage++;reset(true);return;}
  if(motion&&now-motion.started>=WALK_DURATION){motion=null;resolveLanding();}
  if(trapEffect){
   const elapsed=now-trapEffect.started;
   if(elapsed>=650&&!trapEffect.warped){
    player={...START};if(performance.now()<goalUntil)guideDistances=goalDistances(grid,goal,fakeGoals);facing='down';revealAround(explored,player);trapEffect.warped=true;
    status.textContent='偽ゴール！ スタートへワープしました（'+steps+'歩）';
   }
   if(elapsed>=1100)trapEffect=null;
  }
  if(!motion&&!trapEffect&&!won){
   const direction=pendingDirection||Array.from(heldInputs.values()).at(-1);pendingDirection=null;
   if(direction)move(direction);
  }
  draw();
  if(animationFrame===null&&(isChallenge()&&!timeOver||motion||trapEffect||heldInputs.size||now<scanUntil||now<goalUntil||(goalEffect&&now-goalEffect.started<3000)))animationFrame=requestAnimationFrame(animate);
 }
 // 地形を一度描いて保存し、移動しても草や土の模様が変わらないようにする。
 function buildTerrain(){
  terrain=document.createElement('canvas');terrain.width=canvas.width;terrain.height=canvas.height;
  const brush=terrain.getContext('2d');
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   let seed=(x+1)*73856093^(y+1)*19349663;
   const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
   const wall=grid[y][x]===1,left=x*cell,top=y*cell;
   brush.fillStyle=wall?'#397c36':'#b38351';brush.fillRect(left,top,cell,cell);
   brush.save();brush.beginPath();brush.rect(left,top,cell,cell);brush.clip();
   for(let i=0;i<18;i++){
    const px=left+random()*cell,py=top+random()*cell;
    if(wall){
     const height=cell*(.12+random()*.17);
     brush.strokeStyle=['#70a849','#255c2c','#91b85a'][i%3];brush.lineWidth=Math.max(1,cell*.035);
     brush.beginPath();brush.moveTo(px-cell*.07,py-height*.65);brush.lineTo(px,py);brush.lineTo(px+cell*.05,py-height);brush.stroke();
    }else{
     const radius=cell*(.015+random()*.025);
     brush.fillStyle=['#bf915e','#a77747','#c29665','#ad7d4b'][i%4];
     brush.globalAlpha=.4;
     brush.beginPath();brush.arc(px,py,radius,0,Math.PI*2);brush.fill();
     brush.globalAlpha=1;
    }
   }
   brush.restore();
  }
 }
 function updateDetector(){
  goalButton.textContent='🧭 ゴール探知機（残り'+goalUses+'回）';
  goalButton.disabled=!isExplorationMode()||goalUses===0||won||!!motion||!!trapEffect||performance.now()<goalUntil;
  const guide=performance.now()<goalUntil&&!won?guidanceAt(player):null;
  guideStatus.textContent=performance.now()<goalUntil&&!won?'ゴール案内：'+(guide?{up:'↑ 上へ',down:'↓ 下へ',left:'← 左へ',right:'→ 右へ'}[guide.direction]:'ゴール到着')+' ｜ 残り'+Math.ceil((goalUntil-performance.now())/1000)+'秒':'';
  const targets=unrevealedRooms(rooms,explored);
  largeButton.textContent='🔦 大型探知君（所持'+largeUses+'個）';
  largeButton.disabled=!isExplorationMode()||largeUses===0||won||!!motion||!!trapEffect||performance.now()<scanUntil;
  scanStatus.textContent=performance.now()<scanUntil?'7×7照射中：残り'+Math.ceil((scanUntil-performance.now())/1000)+'秒':'';
  detectorButton.textContent='📡 大部屋探知機（残り'+detectorUses+'回）';
  detectorButton.disabled=detectorUses===0||!targets.length||!isExplorationMode()||won||!!motion||!!trapEffect;
 }
 function useDetector(){
  if(expireChallenge()||detectorUses===0||!isExplorationMode()||won||motion||trapEffect)return;
  const targets=unrevealedRooms(rooms,explored);
  if(!targets.length){itemStatus.textContent='照らせる大部屋がありません。';return;}
  const room=targets[Math.floor(Math.random()*targets.length)];
  revealRoom(explored,room);detectorUses--;
  itemStatus.textContent='📡 大部屋を1つ発見！ 部屋全体を照らしました。';draw();
 }
 function draw(){
  updateChallenge();updateDetector();
  const camera=isZoomed()?cameraFor(size,displayPosition()):{x:0,y:0,viewSize:size};
  ctx.save();
  if(isZoomed()){ctx.scale(size/camera.viewSize,size/camera.viewSize);ctx.translate(-camera.x*cell,-camera.y*cell);}
  ctx.drawImage(terrain,0,0);
  if(isExplorationMode()){ctx.fillStyle='#080e19';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!isVisible(x,y))ctx.fillRect(x*cell,y*cell,cell,cell);}
  for(const [p,color,label] of [[START,'#42b87b','S'],[goal,'#f7c34a','G'],...fakeGoals.map(p=>[p,'#d3a43d','G'])]){if(isExplorationMode()&&!isVisible(p.x,p.y))continue;ctx.fillStyle=color;ctx.fillRect(p.x*cell,p.y*cell,cell,cell);ctx.fillStyle='#16263c';ctx.font=`bold ${Math.floor(cell*.6)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,(p.x+.5)*cell,(p.y+.5)*cell);}
  for(const largePickup of largePickups)if(!isExplorationMode()||isVisible(largePickup.x,largePickup.y)){
   ctx.fillStyle='#bcefff';ctx.fillRect(largePickup.x*cell,largePickup.y*cell,cell,cell);
   ctx.fillStyle='#145c8a';ctx.font='bold '+Math.floor(cell*.75)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText('◆',(largePickup.x+.5)*cell,(largePickup.y+.5)*cell);
  }
  drawGoalGuide();drawPlayer();drawTrapEffect();ctx.restore();drawMiniMap(camera);drawTrapBanner();drawGoalEffect();
  if(timeOver){ctx.save();ctx.fillStyle='#10243aeF';ctx.fillRect(35,150,canvas.width-70,130);ctx.fillStyle='#a9e8ff';ctx.textAlign='center';ctx.font='bold 30px system-ui';ctx.fillText('10分チャレンジ終了！',canvas.width/2,195);ctx.font='22px system-ui';ctx.fillText('ステージ'+stage+'到達 ／ '+(stage-1)+'ステージクリア',canvas.width/2,245);ctx.restore();}
 }
 function reset(nextStage=false){if(mapDialog.open)mapDialog.close();if(nextStage!==true){stage=1;challengeDeadline=isChallenge()?performance.now()+600000:0;}timeOver=false;clearInput();if(animationFrame!==null)cancelAnimationFrame(animationFrame);animationFrame=null;motion=null;trapEffect=null;goalEffect=null;scanUntil=0;goalUntil=0;guideDistances=null;goalUses=isExplorationMode()?1:0;largeUses=0;facing='down';size=isChallenge()?30+(stage-1)*5:Number(difficulty.value);const layout=generateLayout(size,isChallenge()?stage:0);rooms=layout.rooms;detectorUses=isExplorationMode()?1:0;largePickups=isExplorationMode()?placeLargeDetector(layout.grid,rooms,size,isChallenge()?stage:0):[];itemStatus.textContent=!isExplorationMode()?'通常モードでは探知アイテムは使えません。':size===13?'かんたんモードには大部屋がありません。':'探索モードで使用できます。';goal=layout.goal;fakeGoals=layout.fakeGoals;cell=canvas.width/size;grid=layout.grid;buildTerrain();player={...START};explored=Array.from({length:size},()=>Array(size).fill(false));revealAround(explored,player);steps=0;won=false;document.getElementById('room-info').textContent=isChallenge()?'大部屋の数は不明。ゴールを探して次のステージへ！':size===13?'かんたん：大部屋なし。':size===21?'ふつう：離れた場所に大部屋が'+layout.rooms.length+'つ。どれか1部屋にゴールがあります。':size===50?'鬼レベル：50×50、大部屋5つ。本物1つ・偽ゴール3つ・空の部屋1つ。':'むずかしい：遠くに大部屋が3つ。どれか1部屋にゴールがあります。';status.textContent='スタート！ 0歩';draw();if(isChallenge())animationFrame=requestAnimationFrame(animate);}
 function move(dir){if(expireChallenge()||won||motion||trapEffect)return;facing=dir;const [dx,dy]=directions[dir],x=player.x+dx,y=player.y+dy;if(!canMove(grid,x,y)){draw();return;}motion={from:{...player},started:performance.now()};player={x,y};revealAround(explored,player);steps++;status.textContent=`${steps}歩`;draw();if(animationFrame===null)animationFrame=requestAnimationFrame(animate);}
 const keyDirection=key=>({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'}[key.length===1?key.toLowerCase():key]);
 document.addEventListener('keydown',e=>{
  if(mapDialog.open){if(keyDirection(e.key))e.preventDefault();return;}
  if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLInputElement||e.target.isContentEditable)return;
  const direction=keyDirection(e.key);if(!direction)return;e.preventDefault();
  if(e.repeat)return;heldInputs.delete('key:'+e.key);heldInputs.set('key:'+e.key,direction);requestMovement(direction);
 });
 document.addEventListener('keyup',e=>{if(keyDirection(e.key)){e.preventDefault();heldInputs.delete('key:'+e.key);}});
 document.querySelectorAll('[data-dir]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);heldInputs.set('pointer:'+e.pointerId,button.dataset.dir);requestMovement(button.dataset.dir);});
  const release=e=>heldInputs.delete('pointer:'+e.pointerId);
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  button.addEventListener('click',e=>{if(e.detail===0)requestMovement(button.dataset.dir);});
 });
 if(typeof window!=='undefined')window.addEventListener('blur',clearInput);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
 document.getElementById('expand-map').addEventListener('click',openFullMap);
 miniMap.addEventListener('click',openFullMap);
 document.getElementById('close-map').addEventListener('click',()=>mapDialog.close());
 mapDialog.addEventListener('close',clearInput);
 goalButton.addEventListener('click',useGoalDetector);largeButton.addEventListener('click',useLargeDetector);detectorButton.addEventListener('click',useDetector);document.getElementById('reset').addEventListener('click',reset);difficulty.addEventListener('change',reset);exploration.addEventListener('change',reset);reset();
}






