// This is the Server Component page.
// It is responsible for handling the route params and passing them to the Client Component.
import JobDetailsClient from './job-details-client';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  // We extract the 'id' here on the server and pass it as a simple prop
  // to the client component. This is the recommended pattern.
  return <JobDetailsClient id={params.id} />;
}
