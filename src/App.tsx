import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './stores/auth';
import AppShell from './layout/AppShell';
import Home from './routes/Home';
import Explore from './routes/Explore';
import Browse from './routes/Browse';
import Library from './routes/Library';
import Addons from './routes/Addons';
import Settings from './routes/Settings';
import Placeholder from './routes/Placeholder';
import DetailModal from './components/DetailModal/DetailModal';
import VideoPlayer from './components/VideoPlayer/VideoPlayer';
import AuthModal from './components/AuthModal';

/* Hash routing — matches Stremio's web app (React Router in hash mode) and needs
 * zero server config (any static host works, no catch-all rewrite). A legacy
 * #home → #/ redirect for old bookmarks gets added in Phase 1. */
export default function App() {
  const refresh = useAuth((s) => s.refresh);
  const loadConfig = useAuth((s) => s.loadConfig);
  useEffect(() => { refresh(); loadConfig(); }, [refresh, loadConfig]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          {/* discover surfaces */}
          <Route path="explore" element={<Explore />} />
          <Route path="categories" element={<Explore />} />
          <Route path="tv" element={<Browse cat="trending_tv" />} />
          <Route path="movies" element={<Browse cat="trending_movie" />} />
          <Route path="anime" element={<Browse cat="trending_anime" />} />
          <Route path="browse/:cat" element={<Browse />} />
          {/* library / add-ons / settings (auth gating applied in Phase 5) */}
          <Route path="library" element={<Library />} />
          <Route path="addons" element={<Addons />} />
          <Route path="settings" element={<Settings />} />
          {/* public footer pages */}
          <Route path="legal" element={<Placeholder name="Legal" phase="Phase 1" />} />
          <Route path="terms" element={<Placeholder name="Terms" phase="Phase 1" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <DetailModal />
      <VideoPlayer />
      <AuthModal />
    </HashRouter>
  );
}
