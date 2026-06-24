import { employeeRoutes } from './src/backend/routes/employeeRoutes.js';
console.log('employeeRoutes.stack length', employeeRoutes.stack.length);
for (const layer of employeeRoutes.stack) {
  const handle = layer.handle?.name || '<anon>';
  const methods = layer.route ? Object.keys(layer.route.methods).join(',') : '';
  const path = layer.route ? layer.route.path : layer.regexp?.source;
  console.log({ layerName: layer.name, path, methods, handle });
}
