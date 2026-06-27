import { headers } from 'next/headers';
import { HandFreeApp } from '@/components/handfree/handfree-app';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return <HandFreeApp appConfig={appConfig} />;
}
