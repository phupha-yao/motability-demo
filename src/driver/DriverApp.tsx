import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isEmbedded, PhoneFrame } from '../components/PhoneFrame';
import { AboutYou, CheckAndSend, ConfirmPart, Sent, TellUsMore, WhatHappened } from './CicelyFinish';
import { ConfirmCharger, ListPicker, PhotoScreen } from './CicelyStart';
import { ChargerDetail, MapScreen } from './GoScreens';
import { PointScreen } from './PointScreen';

const BARE = isEmbedded();

/** Move focus to the new screen's heading so screen readers announce each step. */
function useFocusOnNavigate() {
  const { pathname } = useLocation();
  useEffect(() => {
    const h = document.querySelector<HTMLElement>('[data-autofocus]');
    if (h) h.focus({ preventScroll: true });
    document.getElementById('cicely-main')?.scrollTo({ top: 0 });
  }, [pathname]);
}

export default function DriverApp() {
  useFocusOnNavigate();
  return (
    <PhoneFrame bare={BARE}>
      <Routes>
        <Route index element={<MapScreen />} />
        <Route path="site/:siteId" element={<ChargerDetail />} />
        <Route path="cicely/charger" element={<ConfirmCharger />} />
        <Route path="cicely/photo" element={<PhotoScreen />} />
        <Route path="cicely/point" element={<PointScreen />} />
        <Route path="cicely/list" element={<ListPicker />} />
        <Route path="cicely/part" element={<ConfirmPart />} />
        <Route path="cicely/what" element={<WhatHappened />} />
        <Route path="cicely/more" element={<TellUsMore />} />
        <Route path="cicely/about" element={<AboutYou />} />
        <Route path="cicely/check" element={<CheckAndSend />} />
        <Route path="cicely/sent" element={<Sent />} />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    </PhoneFrame>
  );
}
