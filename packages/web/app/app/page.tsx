import { CommunicationScreen } from '@/components/CommunicationScreen';
import '@/styles/app.css';

/** The communication screen, at /app (ADR-006). Everything runs in the browser; the dictionary loads from /data. */
export default function Page() {
  return <CommunicationScreen />;
}
