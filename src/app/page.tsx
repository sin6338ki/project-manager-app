'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Plus,
    Quote,
    X,
    Trash2,
    Calendar,
    Users,
    ChevronRight,
    BookOpen,
    Clock,
    CalendarIcon,
    Video,
    Edit,
    MapPin,
    FileText,
    Target,
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
    Project,
    STATUS_LABELS,
    STATUS_COLORS,
    PRIORITY_COLORS,
    ProjectStatus,
    ProjectPriority,
    User,
} from '@/types';
import { useAuth } from '@/lib/auth-context';

interface QuoteData {
    id: string;
    content: string;
    author: string | null;
}

interface BookData {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    weekStart: string;
}

interface CalendarAttendee {
    id: string;
    userId: string;
    user?: User;
}

interface CalendarEvent {
    id: string;
    type: 'schedule' | 'meeting';
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    content?: string | null;
    purpose?: string | null;
    result?: string | null;
    attendees?: CalendarAttendee[];
    createdAt: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    schedule: '일정',
    meeting: '회의',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
    schedule: 'bg-blue-100 text-blue-800',
    meeting: 'bg-purple-100 text-purple-800',
};

// 모든 하위 프로젝트를 재귀적으로 가져오는 함수
function getAllSubProjects(project: Project): Project[] {
    const result: Project[] = [];
    if (project.subProjects) {
        for (const sub of project.subProjects) {
            result.push(sub);
            result.push(...getAllSubProjects(sub));
        }
    }
    return result;
}

// 시간 문자열 → { period, hour, minute } 파싱
function parseTime(time: string) {
    if (!time) return { period: '오전', hour: '9', minute: '00' };
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    return {
        period: h < 12 ? '오전' : '오후',
        hour: String(h === 0 ? 12 : h > 12 ? h - 12 : h),
        minute: mStr || '00',
    };
}

// { period, hour, minute } → "HH:mm" 문자열
function buildTime(period: string, hour: string, minute: string): string {
    let h = parseInt(hour, 10);
    if (period === '오전') {
        if (h === 12) h = 0;
    } else {
        if (h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${minute}`;
}

function addOneHour(time: string): string {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    h = (h + 1) % 24;
    return `${String(h).padStart(2, '0')}:${mStr}`;
}

const hourOptions = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const minuteOptions = ['00', '10', '20', '30', '40', '50'];


export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [randomQuote, setRandomQuote] = useState<QuoteData | null>(null);
    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [allQuotes, setAllQuotes] = useState<QuoteData[]>([]);
    const [newQuoteContent, setNewQuoteContent] = useState('');
    const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
    const [book, setBook] = useState<BookData | null>(null);
    const [showBookModal, setShowBookModal] = useState(false);
    const [showAllBooksModal, setShowAllBooksModal] = useState(false);
    const [allBooks, setAllBooks] = useState<BookData[]>([]);
    const [bookForm, setBookForm] = useState({
        title: '',
        author: '',
        description: '',
    });

    // 오늘의 일정
    const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [eventForm, setEventForm] = useState({
        type: 'schedule' as 'schedule' | 'meeting',
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        content: '',
        purpose: '',
        result: '',
        attendeeIds: [] as string[],
    });

    // 칸반 드래그 순서
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragIdRef = React.useRef<string | null>(null);

    const { isAdmin } = useAuth();

    useEffect(() => {
        fetchProjects();
        fetchRandomQuote();
        fetchBook();
        fetchTodayEvents();
        fetchUsers();
    }, []);

    const fetchRandomQuote = async () => {
        try {
            const res = await fetch('/api/quotes?random=true');
            const data = await res.json();
            setRandomQuote(data);
        } catch (error) {
            console.error('Failed to fetch random quote:', error);
        }
    };

    const fetchAllQuotes = async () => {
        try {
            const res = await fetch('/api/quotes');
            const data = await res.json();
            setAllQuotes(data);
        } catch (error) {
            console.error('Failed to fetch quotes:', error);
        }
    };

    const handleAddQuote = async () => {
        if (!newQuoteContent.trim()) return;
        try {
            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newQuoteContent,
                    author: newQuoteAuthor || null,
                }),
            });
            if (res.ok) {
                setNewQuoteContent('');
                setNewQuoteAuthor('');
                fetchAllQuotes();
                if (!randomQuote) {
                    fetchRandomQuote();
                }
            }
        } catch (error) {
            console.error('Failed to add quote:', error);
        }
    };

    const handleDeleteQuote = async (id: string) => {
        try {
            const res = await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAllQuotes();
                if (randomQuote?.id === id) {
                    fetchRandomQuote();
                }
            }
        } catch (error) {
            console.error('Failed to delete quote:', error);
        }
    };

    const openQuoteModal = () => {
        fetchAllQuotes();
        setShowQuoteModal(true);
    };

    const fetchBook = async () => {
        try {
            const res = await fetch('/api/books');
            const data = await res.json();
            setBook(data);
        } catch (error) {
            console.error('Failed to fetch book:', error);
        }
    };

    const fetchAllBooks = async () => {
        try {
            const res = await fetch('/api/books?all=true');
            const data = await res.json();
            setAllBooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch all books:', error);
        }
    };

    const openBookListModal = () => {
        fetchAllBooks();
        setShowAllBooksModal(true);
    };

    const openBookModal = () => {
        setBookForm({
            title: book?.title || '',
            author: book?.author || '',
            description: book?.description || '',
        });
        setShowBookModal(true);
    };

    const handleSaveBook = async () => {
        if (!bookForm.title.trim()) return;
        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookForm),
            });
            if (res.ok) {
                fetchBook();
                setShowBookModal(false);
            }
        } catch (error) {
            console.error('Failed to save book:', error);
        }
    };

    // 오늘 날짜 기반 캘린더 이벤트 조회
    const fetchTodayEvents = async () => {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const todayOnly = data.filter((e: CalendarEvent) =>
                    isSameDay(new Date(e.date), today)
                );
                setTodayEvents(todayOnly);
            }
        } catch (error) {
            console.error('Failed to fetch today events:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    // 오늘 날짜 + 현재 시간 이후로 자동 설정
    const getDefaultEventTimes = () => {
        const now = new Date();
        const h = now.getHours();
        // 현재 시간의 다음 정시로 설정 (ex: 17:30 → 18:00)
        const nextHour = now.getMinutes() > 0 ? h + 1 : h;
        const startH = nextHour % 24;
        const endH = (startH + 1) % 24;
        const startTime = `${String(startH).padStart(2, '0')}:00`;
        const endTime = `${String(endH).padStart(2, '0')}:00`;
        return { startTime, endTime };
    };

    const openCreateEventModal = () => {
        const today = new Date();
        const { startTime, endTime } = getDefaultEventTimes();
        setEditingEvent(null);
        setEventForm({
            type: 'schedule',
            title: '',
            date: format(today, 'yyyy-MM-dd'),
            startTime,
            endTime,
            location: '',
            content: '',
            purpose: '',
            result: '',
            attendeeIds: [],
        });
        setShowEventModal(true);
    };

    const openEditEventModal = (event: CalendarEvent) => {
        setEditingEvent(event);
        setEventForm({
            type: event.type,
            title: event.title,
            date: format(new Date(event.date), 'yyyy-MM-dd'),
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            location: event.location || '',
            content: event.content || '',
            purpose: event.purpose || '',
            result: event.result || '',
            attendeeIds: event.attendees?.map((a) => a.userId) || [],
        });
        setShowDetailModal(false);
        setShowEventModal(true);
    };

    const handleSubmitEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingEvent ? `/api/calendar/${editingEvent.id}` : '/api/calendar';
            const method = editingEvent ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventForm),
            });
            if (res.ok) {
                setShowEventModal(false);
                setEditingEvent(null);
                fetchTodayEvents();
            }
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/calendar/${eventId}`, { method: 'DELETE' });
            if (res.ok) {
                setShowDetailModal(false);
                setSelectedEvent(null);
                fetchTodayEvents();
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    };

    const toggleAttendee = (userId: string) => {
        setEventForm((prev) => ({
            ...prev,
            attendeeIds: prev.attendeeIds.includes(userId)
                ? prev.attendeeIds.filter((id) => id !== userId)
                : [...prev.attendeeIds, userId],
        }));
    };

    const updateEventTime = (
        field: 'startTime' | 'endTime',
        part: 'period' | 'hour' | 'minute',
        value: string
    ) => {
        setEventForm((prev) => {
            const current = parseTime(prev[field]);
            const updated = { ...current, [part]: value };
            const newTime = buildTime(updated.period, updated.hour, updated.minute);
            if (field === 'startTime') {
                return { ...prev, startTime: newTime, endTime: addOneHour(newTime) };
            }
            return { ...prev, [field]: newTime };
        });
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects?parentId=null');
            const data = await res.json();
            setProjects(data);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    // 칸반 드래그 핸들러 (DB에 순서 저장)
    const handleKanbanDragStart = (e: React.DragEvent, id: string) => {
        dragIdRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleKanbanDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (dragIdRef.current && dragIdRef.current !== targetId) {
            setDragOverId(targetId);
        }
    };

    const handleKanbanDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const fromId = dragIdRef.current;
        if (!fromId || fromId === targetId) {
            setDragOverId(null);
            return;
        }

        let newOrder: Project[] = [];
        setProjects((prev) => {
            const list = [...prev];
            const fromIdx = list.findIndex((p) => p.id === fromId);
            const toIdx = list.findIndex((p) => p.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const [moved] = list.splice(fromIdx, 1);
            list.splice(toIdx, 0, moved);
            newOrder = list;
            return list;
        });

        dragIdRef.current = null;
        setDragOverId(null);

        // DB에 순서 저장 (낙관적 업데이트 후 백그라운드 저장)
        if (newOrder.length > 0) {
            fetch('/api/projects/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds: newOrder.map((p) => p.id) }),
            }).catch((err) => console.error('Failed to save order:', err));
        }
    };

    const handleKanbanDragEnd = () => {
        dragIdRef.current = null;
        setDragOverId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 명언 + 책 추천 한 행 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 명언 섹션 */}
                <div>
                    {randomQuote ? (
                        <div
                            className={`relative bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 shadow-lg overflow-hidden h-full ${
                                isAdmin
                                    ? 'cursor-pointer hover:from-indigo-700 hover:to-blue-700'
                                    : ''
                            } transition-all duration-300`}
                            onClick={isAdmin ? openQuoteModal : undefined}
                        >
                            {/* 오늘의 명언 타이틀 */}
                            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-3">
                                오늘의 명언
                            </p>
                            <div className="absolute top-8 left-4 text-indigo-300 opacity-40 text-7xl font-serif leading-none select-none">
                                &ldquo;
                            </div>
                            <div className="relative z-10 flex flex-col items-center text-center px-4 py-1">
                                <Quote className="w-5 h-5 text-indigo-200 mb-2" />
                                <p className="text-white text-base font-medium italic leading-relaxed">
                                    &ldquo;{randomQuote.content}&rdquo;
                                </p>
                                {randomQuote.author && (
                                    <p className="text-indigo-200 text-sm mt-2 font-semibold tracking-wide">
                                        — {randomQuote.author}
                                    </p>
                                )}
                            </div>
                            <div className="absolute bottom-3 right-4 text-indigo-300 opacity-40 text-7xl font-serif leading-none select-none rotate-180">
                                &ldquo;
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`relative bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 shadow-lg h-full ${
                                isAdmin
                                    ? 'cursor-pointer hover:from-indigo-700 hover:to-blue-700'
                                    : ''
                            } transition-all duration-300`}
                            onClick={isAdmin ? openQuoteModal : undefined}
                        >
                            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-3">
                                오늘의 명언
                            </p>
                            <div className="flex items-center justify-center gap-2 text-indigo-200 py-4">
                                <Quote className="w-5 h-5" />
                                <span>
                                    {isAdmin
                                        ? '클릭하여 명언을 등록하세요'
                                        : '등록된 명언이 없습니다'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 이번 주 책 추천 섹션 */}
                <div>
                    {book ? (
                        <div
                            className="relative bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 shadow-lg overflow-hidden h-full cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
                            onClick={openBookListModal}
                        >
                            <div className="flex items-start gap-4 h-full">
                                <div className="flex-shrink-0 bg-white/20 rounded-lg p-3">
                                    <BookOpen className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-amber-100 text-xs font-semibold uppercase tracking-widest mb-1">
                                        이번 주 추천 도서
                                    </p>
                                    <p className="text-white text-lg font-bold leading-tight">
                                        {book.title}
                                    </p>
                                    {book.author && (
                                        <p className="text-amber-100 text-sm mt-0.5">
                                            저자: {book.author}
                                        </p>
                                    )}
                                    {book.description && (
                                        <p className="text-amber-50 text-sm mt-2 line-clamp-3 leading-relaxed">
                                            {book.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openBookModal();
                                    }}
                                    className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                    title="수정"
                                >
                                    <Edit className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            className={`bg-amber-50 border border-dashed border-amber-300 rounded-xl p-6 h-full ${
                                isAdmin ? 'cursor-pointer hover:bg-amber-100' : ''
                            } transition-colors`}
                            onClick={isAdmin ? openBookModal : undefined}
                        >
                            <p className="text-amber-600 text-xs font-semibold uppercase tracking-widest mb-3">
                                이번 주 추천 도서
                            </p>
                            <div className="flex items-center justify-center gap-2 text-amber-600 py-4">
                                <BookOpen className="w-5 h-5" />
                                <span>
                                    {isAdmin
                                        ? '클릭하여 이번 주 추천 도서를 등록하세요'
                                        : '이번 주 추천 도서가 없습니다'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 오늘의 일정 섹션 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            오늘의 일정
                        </h2>
                        <span className="text-sm text-gray-500">
                            {format(new Date(), 'M월 d일 (EEE)', { locale: ko })}
                        </span>
                        {todayEvents.length > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                {todayEvents.length}
                            </span>
                        )}
                    </div>
                    <Button size="sm" onClick={openCreateEventModal}>
                        <Plus className="w-4 h-4 mr-1" />
                        일정 추가
                    </Button>
                </div>

                {todayEvents.length > 0 ? (
                    <div className="space-y-2">
                        {todayEvents
                            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                            .map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedEvent(event);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            event.type === 'meeting'
                                                ? 'bg-purple-500'
                                                : 'bg-blue-500'
                                        }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {event.title}
                                        </p>
                                        {(event.startTime || event.location) && (
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {event.startTime && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {event.startTime}
                                                        {event.endTime && ` ~ ${event.endTime}`}
                                                    </span>
                                                )}
                                                {event.location && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {event.location}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Badge className={`${EVENT_TYPE_COLORS[event.type]} text-xs flex-shrink-0`}>
                                        {EVENT_TYPE_LABELS[event.type]}
                                    </Badge>
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                        <CalendarIcon className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">오늘 등록된 일정이 없습니다</p>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-500">프로젝트 현황을 한눈에 확인하세요</p>
                </div>
                <Link href="/projects/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />새 프로젝트
                    </Button>
                </Link>
            </div>

            {/* 책 목록 조회 모달 */}
            {showAllBooksModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">추천 도서 목록</h2>
                            <div className="flex items-center gap-2">
                                {isAdmin && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setShowAllBooksModal(false);
                                            openBookModal();
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        이번 주 등록
                                    </Button>
                                )}
                                <button
                                    onClick={() => setShowAllBooksModal(false)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {allBooks.length > 0 ? (
                                <ul className="space-y-3">
                                    {allBooks.map((b) => (
                                        <li
                                            key={b.id}
                                            className="p-4 bg-amber-50 rounded-lg border border-amber-100"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 bg-amber-200 rounded p-1.5">
                                                    <BookOpen className="w-4 h-4 text-amber-700" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-amber-600 font-medium mb-0.5">
                                                        {format(new Date(b.weekStart), 'yyyy년 M월 d일', { locale: ko })} 주차
                                                    </p>
                                                    <p className="font-semibold text-gray-900">
                                                        {b.title}
                                                    </p>
                                                    {b.author && (
                                                        <p className="text-sm text-gray-600 mt-0.5">
                                                            저자: {b.author}
                                                        </p>
                                                    )}
                                                    {b.description && (
                                                        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                                            {b.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    등록된 추천 도서가 없습니다
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 책 추천 등록/수정 모달 */}
            {showBookModal && isAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">이번 주 추천 도서 등록</h2>
                            <button
                                onClick={() => setShowBookModal(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <input
                                type="text"
                                placeholder="책 제목 *"
                                value={bookForm.title}
                                onChange={(e) =>
                                    setBookForm((f) => ({ ...f, title: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                                type="text"
                                placeholder="저자 (선택사항)"
                                value={bookForm.author}
                                onChange={(e) =>
                                    setBookForm((f) => ({ ...f, author: e.target.value }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <textarea
                                placeholder="추천 이유 또는 한줄 소개 (선택사항)"
                                value={bookForm.description}
                                onChange={(e) =>
                                    setBookForm((f) => ({ ...f, description: e.target.value }))
                                }
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 px-4 pb-4">
                            <Button variant="secondary" onClick={() => setShowBookModal(false)}>
                                취소
                            </Button>
                            <Button onClick={handleSaveBook} disabled={!bookForm.title.trim()}>
                                저장
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 명언 관리 모달 */}
            {showQuoteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold">명언 관리</h2>
                            <button
                                onClick={() => setShowQuoteModal(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isAdmin && (
                            <div className="p-4 border-b">
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        placeholder="명언 내용을 입력하세요"
                                        value={newQuoteContent}
                                        onChange={(e) => setNewQuoteContent(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="저자 (선택사항)"
                                            value={newQuoteAuthor}
                                            onChange={(e) => setNewQuoteAuthor(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <Button
                                            onClick={handleAddQuote}
                                            disabled={!newQuoteContent.trim()}
                                        >
                                            추가
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4">
                            {allQuotes.length > 0 ? (
                                <ul className="space-y-3">
                                    {allQuotes.map((quote) => (
                                        <li
                                            key={quote.id}
                                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="text-gray-800">
                                                    &ldquo;{quote.content}&rdquo;
                                                </p>
                                                {quote.author && (
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        - {quote.author}
                                                    </p>
                                                )}
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDeleteQuote(quote.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    등록된 명언이 없습니다
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 일정 등록/수정 모달 */}
            <Modal
                isOpen={showEventModal}
                onClose={() => {
                    setShowEventModal(false);
                    setEditingEvent(null);
                }}
                title={editingEvent ? '일정 수정' : '일정 등록'}
                size="lg"
            >
                <form onSubmit={handleSubmitEvent} className="space-y-5">
                    {/* 타입 선택 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            유형
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                                    eventForm.type === 'schedule'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                                onClick={() =>
                                    setEventForm((prev) => ({ ...prev, type: 'schedule' }))
                                }
                            >
                                <CalendarIcon className="w-4 h-4" />
                                일정
                            </button>
                            <button
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                                    eventForm.type === 'meeting'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                }`}
                                onClick={() =>
                                    setEventForm((prev) => ({ ...prev, type: 'meeting' }))
                                }
                            >
                                <Video className="w-4 h-4" />
                                회의
                            </button>
                        </div>
                    </div>

                    {/* 제목 */}
                    <Input
                        label="제목 *"
                        value={eventForm.title}
                        onChange={(e) =>
                            setEventForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder={
                            eventForm.type === 'schedule'
                                ? '일정 제목을 입력하세요'
                                : '회의 제목을 입력하세요'
                        }
                        required
                    />

                    {/* 날짜 */}
                    <Input
                        label="날짜 *"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) =>
                            setEventForm((prev) => ({ ...prev, date: e.target.value }))
                        }
                        required
                    />

                    {/* 시작 시간 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            시작 시간
                        </label>
                        {!eventForm.startTime ? (
                            <button
                                type="button"
                                onClick={() => {
                                    const { startTime, endTime } = getDefaultEventTimes();
                                    setEventForm((prev) => ({ ...prev, startTime, endTime }));
                                }}
                                className="px-4 py-2 text-sm border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                            >
                                + 시간 추가
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    {['오전', '오후'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => updateEventTime('startTime', 'period', p)}
                                            className={`px-3 py-2 text-sm font-medium transition-colors ${
                                                parseTime(eventForm.startTime).period === p
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <select
                                    value={parseTime(eventForm.startTime).hour}
                                    onChange={(e) =>
                                        updateEventTime('startTime', 'hour', e.target.value)
                                    }
                                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {hourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}시
                                        </option>
                                    ))}
                                </select>
                                <span className="text-gray-400">:</span>
                                <select
                                    value={parseTime(eventForm.startTime).minute}
                                    onChange={(e) =>
                                        updateEventTime('startTime', 'minute', e.target.value)
                                    }
                                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}분
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEventForm((prev) => ({
                                            ...prev,
                                            startTime: '',
                                            endTime: '',
                                        }))
                                    }
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 종료 시간 */}
                    {eventForm.startTime && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                종료 시간
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    {['오전', '오후'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => updateEventTime('endTime', 'period', p)}
                                            className={`px-3 py-2 text-sm font-medium transition-colors ${
                                                parseTime(eventForm.endTime).period === p
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <select
                                    value={parseTime(eventForm.endTime).hour}
                                    onChange={(e) =>
                                        updateEventTime('endTime', 'hour', e.target.value)
                                    }
                                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {hourOptions.map((h) => (
                                        <option key={h} value={h}>
                                            {h}시
                                        </option>
                                    ))}
                                </select>
                                <span className="text-gray-400">:</span>
                                <select
                                    value={parseTime(eventForm.endTime).minute}
                                    onChange={(e) =>
                                        updateEventTime('endTime', 'minute', e.target.value)
                                    }
                                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {minuteOptions.map((m) => (
                                        <option key={m} value={m}>
                                            {m}분
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* 일정 전용 필드 */}
                    {eventForm.type === 'schedule' && (
                        <>
                            <Input
                                label="장소"
                                value={eventForm.location}
                                onChange={(e) =>
                                    setEventForm((prev) => ({
                                        ...prev,
                                        location: e.target.value,
                                    }))
                                }
                                placeholder="장소를 입력하세요"
                            />
                            <Textarea
                                label="내용"
                                value={eventForm.content}
                                onChange={(e) =>
                                    setEventForm((prev) => ({
                                        ...prev,
                                        content: e.target.value,
                                    }))
                                }
                                placeholder="일정 상세 내용을 입력하세요"
                                rows={3}
                            />
                        </>
                    )}

                    {/* 회의 전용 필드 */}
                    {eventForm.type === 'meeting' && (
                        <>
                            <Textarea
                                label="회의 목적"
                                value={eventForm.purpose}
                                onChange={(e) =>
                                    setEventForm((prev) => ({
                                        ...prev,
                                        purpose: e.target.value,
                                    }))
                                }
                                placeholder="회의 목적을 입력하세요"
                                rows={2}
                            />
                            <Textarea
                                label="회의 결과"
                                value={eventForm.result}
                                onChange={(e) =>
                                    setEventForm((prev) => ({
                                        ...prev,
                                        result: e.target.value,
                                    }))
                                }
                                placeholder="회의 결과를 입력하세요 (회의 후 작성)"
                                rows={3}
                            />
                        </>
                    )}

                    {/* 참석자 선택 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                참석자
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    const allSelected =
                                        users.length > 0 &&
                                        eventForm.attendeeIds.length === users.length;
                                    setEventForm((prev) => ({
                                        ...prev,
                                        attendeeIds: allSelected
                                            ? []
                                            : users.map((u) => u.id),
                                    }));
                                }}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    users.length > 0 &&
                                    eventForm.attendeeIds.length === users.length
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                                }`}
                            >
                                {users.length > 0 &&
                                eventForm.attendeeIds.length === users.length
                                    ? '전체 해제'
                                    : '전체 선택'}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {users.map((user) => {
                                const isSelected = eventForm.attendeeIds.includes(user.id);
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => toggleAttendee(user.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                                                isSelected
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {user.name.charAt(0)}
                                        </div>
                                        {user.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="submit">
                            {editingEvent ? '수정하기' : '등록하기'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowEventModal(false);
                                setEditingEvent(null);
                            }}
                        >
                            취소
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* 일정 상세 보기 모달 */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedEvent(null);
                }}
                title="일정 상세"
                size="md"
            >
                {selectedEvent && (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge className={EVENT_TYPE_COLORS[selectedEvent.type]}>
                                        {EVENT_TYPE_LABELS[selectedEvent.type]}
                                    </Badge>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {selectedEvent.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditEventModal(selectedEvent)}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                                {format(
                                    new Date(selectedEvent.date),
                                    'yyyy년 M월 d일 (EEE)',
                                    { locale: ko }
                                )}
                            </span>
                            {selectedEvent.startTime && (
                                <>
                                    <Clock className="w-4 h-4 ml-2" />
                                    <span>
                                        {selectedEvent.startTime}
                                        {selectedEvent.endTime &&
                                            ` ~ ${selectedEvent.endTime}`}
                                    </span>
                                </>
                            )}
                        </div>

                        {selectedEvent.type === 'schedule' && (
                            <>
                                {selectedEvent.location && (
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{selectedEvent.location}</span>
                                    </div>
                                )}
                                {selectedEvent.content && (
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p className="whitespace-pre-wrap">
                                            {selectedEvent.content}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {selectedEvent.type === 'meeting' && (
                            <>
                                {selectedEvent.purpose && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Target className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm font-medium text-gray-700">
                                                회의 목적
                                            </span>
                                        </div>
                                        <p className="text-gray-600 ml-6 whitespace-pre-wrap">
                                            {selectedEvent.purpose}
                                        </p>
                                    </div>
                                )}
                                {selectedEvent.result && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-gray-700">
                                                회의 결과
                                            </span>
                                        </div>
                                        <p className="text-gray-600 ml-6 whitespace-pre-wrap">
                                            {selectedEvent.result}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">
                                        참석자 ({selectedEvent.attendees.length}명)
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 ml-6">
                                    {selectedEvent.attendees.map((attendee) => (
                                        <div
                                            key={attendee.id}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                                                {(attendee.user?.name || '?').charAt(0)}
                                            </div>
                                            {attendee.user?.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* 트렐로 스타일 칸반 보드 */}
            {projects.length > 0 ? (
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                        {projects
                            .filter((p) => p.status !== 'COMPLETED')
                            .map((topProject) => (
                                <div
                                    key={topProject.id}
                                    className={`w-80 flex-shrink-0 rounded-lg transition-all duration-150 ${
                                        dragOverId === topProject.id
                                            ? 'bg-blue-50 ring-2 ring-blue-300'
                                            : 'bg-gray-100'
                                    }`}
                                    draggable
                                    onDragStart={(e) => handleKanbanDragStart(e, topProject.id)}
                                    onDragEnd={handleKanbanDragEnd}
                                    onDragOver={(e) => handleKanbanDragOver(e, topProject.id)}
                                    onDragLeave={() => setDragOverId(null)}
                                    onDrop={(e) => handleKanbanDrop(e, topProject.id)}
                                >
                                    <div className="p-3 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none">
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-gray-300 text-xs">⠿⠿</span>
                                            <Link href={`/projects/${topProject.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-center gap-1 group">
                                                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                        {topProject.name}
                                                    </h3>
                                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                                </div>
                                            </Link>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <span>
                                                {getAllSubProjects(topProject).length}개 하위
                                                프로젝트
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-2 space-y-1.5 max-h-[calc(100vh-350px)] overflow-y-auto">
                                        {topProject.subProjects &&
                                        topProject.subProjects.filter(
                                            (p) => p.status !== 'COMPLETED'
                                        ).length > 0 ? (
                                            <>
                                                {topProject.subProjects
                                                    .filter((p) => p.status !== 'COMPLETED')
                                                    .map((subProject) => (
                                                        <SubProjectGroup
                                                            key={subProject.id}
                                                            project={subProject}
                                                        />
                                                    ))}
                                            </>
                                        ) : (
                                            <div className="p-4 text-center text-gray-400 text-sm">
                                                하위 프로젝트가 없습니다
                                            </div>
                                        )}

                                        <Link
                                            href={`/projects/new?parentId=${topProject.id}`}
                                        >
                                            <button className="w-full p-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1 transition-colors">
                                                <Plus className="w-4 h-4" />
                                                프로젝트 추가
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            ))}

                        <Link href="/projects/new">
                            <div className="w-80 flex-shrink-0 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-colors cursor-pointer">
                                <div className="text-center">
                                    <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <span className="text-gray-500">새 프로젝트 추가</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-12">
                        <p className="text-gray-500 mb-4">아직 프로젝트가 없습니다</p>
                        <Link href="/projects/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />첫 프로젝트 만들기
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// 상위 프로젝트 그룹 (헤더 + 하위 목록)
function SubProjectGroup({ project }: { project: Project }) {
    const activeChildren = project.subProjects?.filter(
        (s) => s.status !== 'COMPLETED'
    ) || [];
    const assignees = project.assignees?.map((a) => ({
        name: a.user?.name || '',
        avatar: a.user?.avatar,
    })) || [];

    return (
        <div className="rounded-lg overflow-hidden border border-blue-100 bg-white">
            {/* 상위 프로젝트 헤더 */}
            <Link href={`/projects/${project.id}`}>
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors border-b border-blue-100 group">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-blue-800 truncate group-hover:text-blue-600">
                            {project.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {assignees.length > 0 && (
                            <AvatarGroup users={assignees} max={2} />
                        )}
                        {activeChildren.length > 0 && (
                            <span className="text-xs text-blue-400">{activeChildren.length}</span>
                        )}
                        <ChevronRight className="w-3 h-3 text-blue-300 group-hover:text-blue-500" />
                    </div>
                </div>
            </Link>

            {/* 하위/최하위 프로젝트 목록 */}
            {activeChildren.length > 0 && (
                <div className="divide-y divide-gray-50">
                    {activeChildren.map((child) => (
                        <CompactProjectRow key={child.id} project={child} depth={2} />
                    ))}
                </div>
            )}
        </div>
    );
}

// 컴팩트 프로젝트 행 (하위/최하위)
function CompactProjectRow({ project, depth }: { project: Project; depth: number }) {
    const assignees = project.assignees?.map((a) => ({
        name: a.user?.name || '',
        avatar: a.user?.avatar,
    })) || [];
    const activeChildren = project.subProjects?.filter(
        (s) => s.status !== 'COMPLETED'
    ) || [];

    const indentClass = depth === 2 ? 'pl-3' : 'pl-6';
    const borderColor = depth === 2 ? 'border-l-green-300' : 'border-l-orange-300';

    return (
        <>
            <Link href={`/projects/${project.id}`}>
                <div
                    className={`flex items-center gap-2 px-2 py-1.5 ${indentClass} border-l-2 ${borderColor} hover:bg-gray-50 transition-colors group`}
                >
                    {/* 이름 */}
                    <span className="text-xs text-gray-700 truncate flex-1 group-hover:text-blue-600 transition-colors">
                        {project.name}
                    </span>

                    {/* 상태 + 담당자 */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {project.endDate && (
                            <span className="text-xs text-gray-400 hidden sm:inline">
                                {format(new Date(project.endDate), 'M/d', { locale: ko })}
                            </span>
                        )}
                        <Badge
                            className={`${STATUS_COLORS[project.status as ProjectStatus]} text-xs py-0 px-1.5 leading-tight`}
                        >
                            {STATUS_LABELS[project.status as ProjectStatus]}
                        </Badge>
                        {assignees.length > 0 && (
                            <AvatarGroup users={assignees} max={2} />
                        )}
                    </div>
                </div>
            </Link>

            {/* 최하위 프로젝트가 있으면 재귀 */}
            {activeChildren.length > 0 && activeChildren.map((child) => (
                <CompactProjectRow key={child.id} project={child} depth={depth + 1} />
            ))}
        </>
    );
}
