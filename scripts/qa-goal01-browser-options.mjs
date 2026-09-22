// QA only: permitted services are loopback; everything else uses the deny proxy.
export function goal01BrowserOptions({proxyPort,allowedPorts}) {
 // Order matters: remove implicit loopback bypass first, then add exact owned ports.
 // Including <-loopback> also prevents Playwright from appending it after our rules.
 const ports=[...new Set(allowedPorts.map(Number))];
 if(ports.some(p=>!Number.isInteger(p)||p<1||p>65535))throw new Error('Invalid owned QA port');
 const bypass=['<-loopback>',...ports.flatMap(p=>['localhost:'+p,'127.0.0.1:'+p])].join(',');
 return {channel:'chrome',headless:true,proxy:{server:'http://127.0.0.1:'+proxyPort,bypass}};
}
