import type { Metadata } from 'next';
import DoctorWorkspaceLayout from '@vetsphere/shared/components/cn/doctor/DoctorWorkspaceLayout';

export const metadata: Metadata = {
  title: '医生工作台 - 宠医界',
  description: '宠医界医生工作台：管理客户、病历、在线问诊、学习课程、职业发展与创业支持。',
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DoctorLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <DoctorWorkspaceLayout locale={locale}>
      {children}
    </DoctorWorkspaceLayout>
  );
}
