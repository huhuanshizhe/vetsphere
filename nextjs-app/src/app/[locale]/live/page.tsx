import { Metadata } from 'next';
import LiveAssistantClient from './LiveAssistantClient';

export const metadata: Metadata = {
  title: 'Live AI Assistant - VetSphere',
  description: 'Voice-activated AI surgical assistant for real-time intraoperative support. Hands-free access to surgical protocols and equipment specifications.',
};

export default function LiveAssistantPage() {
  return <LiveAssistantClient />;
}
