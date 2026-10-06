import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Intro from './pages/Intro';
import DriverApp from './driver/DriverApp';
import NotFound from './pages/NotFound';

const OperatorView = lazy(() => import('./operator/OperatorView'));
const SideBySide = lazy(() => import('./pages/SideBySide'));
const MaskTool = lazy(() => import('./dev/MaskTool'));

function Loading() {
  return (
    <p role="status" className="p-8 font-heading text-lg">
      Loading…
    </p>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/driver/*" element={<DriverApp />} />
        <Route path="/operator" element={<OperatorView />} />
        <Route path="/side-by-side" element={<SideBySide />} />
        {import.meta.env.DEV && <Route path="/dev/masks" element={<MaskTool />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
