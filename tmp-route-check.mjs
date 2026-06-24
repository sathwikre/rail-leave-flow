import { createApp } from './src/backend/app.js';

const app = await createApp();
console.log('routerExists', !!app._router);
console.log('stackLength', app._router?.stack?.length);
for (const layer of app._router?.stack || []) {
  if (layer.route) {
    console.log('route', Object.keys(layer.route.methods).join(','), layer.route.path);
  } else if (layer.name === 'router') {
    console.log('router layer', layer.regexp?.source);
    if (layer.handle && layer.handle.stack) {
      for (const nested of layer.handle.stack) {
        if (nested.route) console.log('  nested', Object.keys(nested.route.methods).join(','), nested.route.path);
      }
    }
  } else {
    console.log('layer', layer.name, layer.regexp?.source);
  }
}
