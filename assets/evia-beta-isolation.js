(()=>{
"use strict";
const PREFIX="evia-beta::";
const rawLocal=window.localStorage;
const rawSession=window.sessionStorage;

function namespacedStorage(raw){
  const visibleKeys=()=>{
    const out=[];
    for(let i=0;i<raw.length;i++){
      const key=raw.key(i);
      if(key&&key.startsWith(PREFIX)) out.push(key.slice(PREFIX.length));
    }
    return out;
  };
  return new Proxy(raw,{
    get(target,prop){
      if(prop==="getItem") return key=>target.getItem(PREFIX+String(key));
      if(prop==="setItem") return (key,value)=>target.setItem(PREFIX+String(key),String(value));
      if(prop==="removeItem") return key=>target.removeItem(PREFIX+String(key));
      if(prop==="clear") return ()=>{
        const physical=[];
        for(let i=0;i<target.length;i++){
          const key=target.key(i);
          if(key&&key.startsWith(PREFIX)) physical.push(key);
        }
        physical.forEach(key=>target.removeItem(key));
      };
      if(prop==="key") return index=>visibleKeys()[Number(index)]??null;
      if(prop==="length") return visibleKeys().length;
      if(prop===Symbol.toStringTag) return "Storage";
      if(typeof prop==="string"){
        const inherited=Reflect.get(target,prop,target);
        if(typeof inherited==="function") return inherited.bind(target);
        if(prop in Storage.prototype) return inherited;
        return target.getItem(PREFIX+prop);
      }
      return Reflect.get(target,prop,target);
    },
    set(target,prop,value){
      if(typeof prop==="string"){
        target.setItem(PREFIX+prop,String(value));
        return true;
      }
      return Reflect.set(target,prop,value,target);
    },
    deleteProperty(target,prop){
      if(typeof prop==="string"){
        target.removeItem(PREFIX+prop);
        return true;
      }
      return true;
    },
    has(target,prop){
      if(typeof prop==="string"&&!(prop in Storage.prototype)) return target.getItem(PREFIX+prop)!==null;
      return prop in target;
    },
    ownKeys(){return visibleKeys();},
    getOwnPropertyDescriptor(target,prop){
      if(typeof prop==="string"&&target.getItem(PREFIX+prop)!==null){
        return {configurable:true,enumerable:true,writable:true,value:target.getItem(PREFIX+prop)};
      }
      return undefined;
    }
  });
}

function installStorageIsolation(){
  Object.defineProperty(window,"localStorage",{value:namespacedStorage(rawLocal),configurable:false});
  Object.defineProperty(window,"sessionStorage",{value:namespacedStorage(rawSession),configurable:false});
}

function installIndexedDbIsolation(){
  if(!window.indexedDB||!window.IDBFactory) return;
  const factory=IDBFactory.prototype;
  const nativeOpen=factory.open;
  const nativeDelete=factory.deleteDatabase;
  const nativeDatabases=factory.databases;
  factory.open=function(name,version){
    const safe=PREFIX+String(name);
    return arguments.length>1?nativeOpen.call(this,safe,version):nativeOpen.call(this,safe);
  };
  factory.deleteDatabase=function(name){return nativeDelete.call(this,PREFIX+String(name));};
  if(typeof nativeDatabases==="function"){
    factory.databases=async function(){
      const rows=await nativeDatabases.call(this);
      return rows.filter(row=>row?.name?.startsWith(PREFIX)).map(row=>({...row,name:row.name.slice(PREFIX.length)}));
    };
  }
}

try{
  installStorageIsolation();
  installIndexedDbIsolation();
  window.__EVIA_BETA_ISOLATED__=true;
}catch(error){
  window.__EVIA_BETA_ISOLATED__=false;
  console.error("Evia Beta isolation failed",error);
  try{
    document.documentElement.innerHTML='<head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui;padding:24px"><h1>Evia Beta</h1><p>Beta storage isolation could not be started. The test app has been stopped to protect the live Evia data.</p></body>';
    window.stop();
  }catch(_){ }
}
})();
