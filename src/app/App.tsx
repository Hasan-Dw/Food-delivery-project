import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router';
import { ScrollToTop } from './router/ScrollToTop';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRouter />
    </BrowserRouter>
  );
}
