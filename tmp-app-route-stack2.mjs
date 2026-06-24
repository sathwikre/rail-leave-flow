import { createApp } from './src/backend/app.js';
const app = await createApp();
const router = app.router;
console.log('router exists', !!router);
console.log('router stack length', router?.stack?.length);
for (const layer of router?.stack || []) {
  console.log('LAYER', layer.name, layer.regexp?.source, layer.route ? Object.keys(layer.route.methods).join(',') + ' ' + layer.route.path : 'no-route');
  if (layer.handle?.stack) {
    for (const nested of layer.handle.stack) {
      if (nested.route) {
        console.log('  NESTED', nested.name, nested.regexp?.source, Object.keys(nested.route.methods).join(',') + ' ' + nested.route.path);
      }
    }
  }
}
process.exit(0);
