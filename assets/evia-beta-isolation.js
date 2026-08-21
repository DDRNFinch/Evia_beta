(()=>{
"use strict";
const PREFIX="evia-beta::";
const rawLocal=window.localStorage;
const rawSession=window.sessionStorage;
const proto=Storage.prototype;
const native={
  getItem:proto.getItem,
  setItem:proto.setItem,
  removeItem:proto.removeItem,
  key:proto.key
};
function rawGet(raw,key){return native.getItem.call(raw,String(key))}
function rawSet(raw,key,value){return native.setItem.call(raw,String(key),String(value))}
function rawRemove(raw,key){return native.removeItem.call(raw,String(key))}
function rawKey(raw,index){return native.key.call(raw,Number(index))}
function courseKey(key,useCourse){
  const text=String(key);
  if(!useCourse)return text;
  try{return window.EviaCourseContext?.physicalKey?.(text)||text}catch{return text}
}
function namespacedStorage(raw,useCourse){
  const visibleKeys=()=>{
    const out=[];
    for(let i=0;i<raw.length;i++){
      const key=rawKey(raw,i);
      if(key&&key.startsWith(PREFIX))out.push(key.slice(PREFIX.length));
    }
    return out;
  };
  const physical=key=>PREFIX+courseKey(key,useCourse);
  return new Proxy(raw,{
    get(target,prop){
      if(prop==="getItem")return key=>rawGet(target,physical(key));
      if(prop==="setItem")return (key,value)=>rawSet(target,physical(key),value);
      if(prop==="removeItem")return key=>rawRemove(target,physical(key));
      if(prop==="clear")return ()=>{
        const keys=[];
        for(let i=0;i<target.length;i++){const key=rawKey(target,i);if(key&&key.startsWith(PREFIX))keys.push(key)}
        keys.forEach(key=>rawRemove(target,key));
      };
      if(prop==="key")return index=>visibleKeys()[Number(index)]??null;
      if(prop==="length")return visibleKeys().length;
      if(prop===Symbol.toStringTag)return"Storage";
      if(typeof prop==="string"){
        const inherited=Reflect.get(target,prop,target);
        if(typeof inherited==="function")return inherited.bind(target);
        if(prop in Storage.prototype)return inherited;
        return rawGet(target,physical(prop));
      }
      return Reflect.get(target,prop,target);
    },
    set(target,prop,value){if(typeof prop==="string"){rawSet(target,physical(prop),value);return true}return Reflect.set(target,prop,value,target)},
    deleteProperty(target,prop){if(typeof prop==="string"){rawRemove(target,physical(prop));return true}return true},
    has(target,prop){if(typeof prop==="string"&&!(prop in Storage.prototype))return rawGet(target,physical(prop))!==null;return prop in target},
    ownKeys(){return visibleKeys()},
    getOwnPropertyDescriptor(target,prop){
      if(typeof prop==="string"){const value=rawGet(target,physical(prop));if(value!==null)return{configurable:true,enumerable:true,writable:true,value}}
      return undefined
    }
  });
}
function installStorageIsolation(){
  window.__EVIA_BETA_STORAGE__={
    prefix:PREFIX,
    readLocalRaw:key=>rawGet(rawLocal,PREFIX+String(key)),
    writeLocalRaw:(key,value)=>rawSet(rawLocal,PREFIX+String(key),value),
    removeLocalRaw:key=>rawRemove(rawLocal,PREFIX+String(key))
  };
  Object.defineProperty(window,"localStorage",{value:namespacedStorage(rawLocal,true),configurable:false});
  Object.defineProperty(window,"sessionStorage",{value:namespacedStorage(rawSession,false),configurable:false});
}
function installIndexedDbIsolation(){
  if(!window.indexedDB||!window.IDBFactory)return;
  const factory=IDBFactory.prototype,nativeOpen=factory.open,nativeDelete=factory.deleteDatabase,nativeDatabases=factory.databases;
  factory.open=function(name,version){const safe=PREFIX+String(name);return arguments.length>1?nativeOpen.call(this,safe,version):nativeOpen.call(this,safe)};
  factory.deleteDatabase=function(name){return nativeDelete.call(this,PREFIX+String(name))};
  if(typeof nativeDatabases==="function")factory.databases=async function(){const rows=await nativeDatabases.call(this);return rows.filter(row=>row?.name?.startsWith(PREFIX)).map(row=>({...row,name:row.name.slice(PREFIX.length)}))}
}
try{
  installStorageIsolation();installIndexedDbIsolation();window.__EVIA_BETA_ISOLATED__=true;
}catch(error){
  window.__EVIA_BETA_ISOLATED__=false;console.error("Evia Beta isolation failed",error);
  try{document.documentElement.innerHTML='<head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;padding:24px"><h1>Evia Beta</h1><p>Beta storage isolation could not be started. The test app has been stopped to protect the live Evia data.</p></body>';window.stop()}catch(_){}
}
})();
