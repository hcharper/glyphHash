import { Suspense } from 'react';
import DocumentsClient from './documents-client';

function DocumentsLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crimson-500"></div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsLoading />}>
      <DocumentsClient />
    </Suspense>
  );
}
