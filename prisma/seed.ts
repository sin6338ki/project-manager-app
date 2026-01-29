import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 기존 데이터 삭제
  await prisma.comment.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.projectAssignee.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // 팀원 생성
  const user1 = await prisma.user.create({
    data: {
      name: '김지영',
      email: 'jiyoung@company.com',
      role: 'admin',
    },
  })

  const user2 = await prisma.user.create({
    data: {
      name: '이민수',
      email: 'minsu@company.com',
      role: 'member',
    },
  })

  const user3 = await prisma.user.create({
    data: {
      name: '박서연',
      email: 'seoyeon@company.com',
      role: 'member',
    },
  })

  const user4 = await prisma.user.create({
    data: {
      name: '정우진',
      email: 'woojin@company.com',
      role: 'member',
    },
  })

  // 상위 프로젝트 1
  const project1 = await prisma.project.create({
    data: {
      name: '모바일 앱 리뉴얼',
      description: '기존 모바일 앱의 UI/UX를 개선하고 새로운 기능을 추가하는 프로젝트',
      goal: '사용자 만족도 30% 향상 및 일일 활성 사용자 수 20% 증가',
      keyResults: '1. 앱 평점 4.5 이상 달성\n2. 페이지 로딩 시간 2초 이내\n3. 사용자 이탈률 15% 감소',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
      progress: 45,
    },
  })

  // 하위 프로젝트들
  const sub1_1 = await prisma.project.create({
    data: {
      name: 'UI 디자인 개편',
      description: '새로운 디자인 시스템 적용 및 화면 리디자인',
      status: 'COMPLETED',
      priority: 'HIGH',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-03-15'),
      progress: 100,
      parentId: project1.id,
    },
  })

  const sub1_2 = await prisma.project.create({
    data: {
      name: '프론트엔드 개발',
      description: '새로운 디자인 기반 프론트엔드 구현',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-05-31'),
      progress: 60,
      parentId: project1.id,
    },
  })

  const sub1_3 = await prisma.project.create({
    data: {
      name: 'QA 및 출시',
      description: '통합 테스트 및 앱스토어 배포',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      startDate: new Date('2025-05-15'),
      endDate: new Date('2025-06-30'),
      progress: 0,
      parentId: project1.id,
    },
  })

  // 상위 프로젝트 2
  const project2 = await prisma.project.create({
    data: {
      name: '고객 관리 시스템 구축',
      description: '새로운 CRM 시스템을 구축하여 고객 데이터를 체계적으로 관리',
      goal: '고객 응대 시간 50% 단축',
      keyResults: '1. 고객 데이터 통합 관리\n2. 자동 응대 시스템 구축\n3. 고객 만족도 조사 시스템 연동',
      status: 'NOT_STARTED',
      priority: 'MEDIUM',
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-09-30'),
      progress: 0,
    },
  })

  // 상위 프로젝트 3
  const project3 = await prisma.project.create({
    data: {
      name: '데이터 분석 대시보드',
      description: '실시간 데이터 분석 및 시각화 대시보드 구축',
      goal: '데이터 기반 의사결정 문화 정착',
      keyResults: '1. 실시간 KPI 모니터링\n2. 자동 보고서 생성\n3. 이상치 탐지 시스템',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-04-30'),
      progress: 70,
    },
  })

  // 담당자 배정
  await prisma.projectAssignee.createMany({
    data: [
      { projectId: project1.id, userId: user1.id, role: 'lead' },
      { projectId: project1.id, userId: user2.id, role: 'member' },
      { projectId: sub1_1.id, userId: user3.id, role: 'lead' },
      { projectId: sub1_2.id, userId: user2.id, role: 'lead' },
      { projectId: sub1_2.id, userId: user4.id, role: 'member' },
      { projectId: sub1_3.id, userId: user4.id, role: 'lead' },
      { projectId: project2.id, userId: user1.id, role: 'lead' },
      { projectId: project2.id, userId: user3.id, role: 'member' },
      { projectId: project3.id, userId: user4.id, role: 'lead' },
      { projectId: project3.id, userId: user2.id, role: 'member' },
    ],
  })

  // 마일스톤
  await prisma.milestone.createMany({
    data: [
      { name: '디자인 시안 확정', projectId: project1.id, dueDate: new Date('2025-02-28'), completed: true },
      { name: '알파 버전 출시', projectId: project1.id, dueDate: new Date('2025-04-30'), completed: false },
      { name: '베타 테스트 시작', projectId: project1.id, dueDate: new Date('2025-05-31'), completed: false },
      { name: '정식 출시', projectId: project1.id, dueDate: new Date('2025-06-30'), completed: false },
    ],
  })

  // 코멘트
  await prisma.comment.createMany({
    data: [
      { content: '디자인 시스템 가이드 문서가 완성되었습니다. 확인 부탁드립니다.', projectId: project1.id, userId: user3.id },
      { content: '프론트엔드 개발 진행 상황을 공유합니다. 메인 화면 작업이 완료되었습니다.', projectId: sub1_2.id, userId: user2.id },
      { content: '이번 스프린트에서 대시보드 차트 기능을 추가했습니다.', projectId: project3.id, userId: user4.id },
    ],
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
