const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('fishSettings',Object.freeze({read:()=>ipcRenderer.invoke('fish:local-settings'),save:patch=>ipcRenderer.invoke('fish:local-settings',patch)}));
