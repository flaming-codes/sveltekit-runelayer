// Admin UI module — exports Svelte components and route handlers for /admin

export { default as AdminLayout } from './components/AdminLayout.svelte';
export { default as Dashboard } from './components/Dashboard.svelte';
export { default as Login } from './components/Login.svelte';
export { default as CollectionList } from './components/CollectionList.svelte';
export { default as CollectionEdit } from './components/CollectionEdit.svelte';
export { default as FieldRenderer } from './components/fields/FieldRenderer.svelte';

export { getAdminRoutes, type SchemaConfig } from './routes.js';
export {
	handleCollectionList,
	handleCollectionGet,
	handleCollectionCreate,
	handleCollectionUpdate,
	handleCollectionDelete,
	type QueryAdapter,
} from './handlers.js';
