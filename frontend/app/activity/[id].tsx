import { CapacityInput } from '@/components/create-activity/capacity-input';
import { ScheduleInput, scheduleDate } from '@/components/create-activity/schedule-input';
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvatarStack } from "../../components/avatar-stack";
import { SportIcon } from "../../components/sport-icon";
import { StatusBadge } from "../../components/status-badge";
import { PrimaryButton, SecondaryButton } from "../../components/ui-buttons";
import { COLORS } from "../../constants/colors";
import type { ActivityDetail, UpdateActivityInput } from "@/lib/api/activities";
import { getActivity, joinActivity, leaveActivity, updateActivity, reportActivity } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import type { PublicProfile } from "@/lib/api/profile";
import { getProfileById } from "@/lib/api/profile";
import { useAuth } from "@/lib/auth/auth-context";
import { formatStartsAt } from "../../utils/date-format";

type Params = { id?: string | string[] };

const normalizeId = (id: Params["id"]) => (Array.isArray(id) ? id[0] : id);
const BORDER = '#E5E7EB';

export default function ActivityDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const id = normalizeId(params.id);

  const { token, userId: viewerId, logout } = useAuth();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [organizer, setOrganizer] = useState<PublicProfile | null>(null);
  const [participantProfiles, setParticipantProfiles] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const actionLock = useRef(false);
  const [editCapacityValid, setEditCapacityValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    sport: string;
    lat: number;
    lon: number;
    address: string;
    date: string;
    maxParticipants: number;
    description: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const isOrganizer = Boolean(viewerId && activity?.organizerId === viewerId);

  const startsAt = useMemo(
    () => (activity ? formatStartsAt(activity.date) : null),
    [activity]
  );

  useEffect(() => {
    if (!id || !token) return;

    let cancelled = false;
    setBusy(true);
    setError(null);
    setActivity(null);
    setOrganizer(null);

    getActivity(token, id)
      .then((res) => {
        if (cancelled) return;
        setActivity(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) logout();
          setError(e.code === 'CAPACITY_BELOW_PARTICIPANTS' ? 'Лимит не может быть меньше текущего числа участников.' : e.code === 'INVALID_ACTIVITY' ? 'Проверьте название, вид спорта, будущую дату и лимит участников.' : `${e.code}: ${e.message}`);
        } else {
          setError('Не удалось загрузить активность.');
        }
      })
      .finally(() => {
        if (cancelled) return;
        setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, token, logout]);

  // Profiles are optional display information. Missing/slow profile lookups
  // must not block the activity or determine the creator's permission to edit.
  useEffect(() => {
    if (!activity?.organizerId || !token) return;
    let cancelled = false;
    const fallback: PublicProfile = { userId: activity.organizerId, username: 'Организатор', favoriteSports: [] };
    setOrganizer(fallback);
    void getProfileById(token, activity.organizerId)
      .then(profile => { if (!cancelled) setOrganizer(profile); })
      .catch(() => { /* Keep the neutral placeholder if the profile is unavailable. */ });
    return () => { cancelled = true; };
  }, [activity?.organizerId, token]);

  // Load participant profiles
  useEffect(() => {
    if (!activity || !token) return;
    if (activity.participants.length === 0) {
      setParticipantProfiles([]);
      return;
    }

    let cancelled = false;

    Promise.all(
      activity.participants.map(p => 
        getProfileById(token, p.userId).catch(() => ({
          userId: p.userId, username: p.role === 'ORGANIZER' ? 'Организатор' : 'Участник', favoriteSports: [],
        }))
      )
    )
      .then((profiles) => {
        if (cancelled) return;
        setParticipantProfiles(profiles);
      })
      .catch(() => {
        // Ignore errors for participant profiles
      });

    return () => {
      cancelled = true;
    };
  }, [activity, token]);

  const canJoin = useMemo(() => {
    if (!activity) return false;
    if (isOrganizer) return false;
    if (activity.status !== 'OPEN') return false;
    if (activity.myRole) return false;
    if (activity.maxParticipants !== 0 && activity.spotsLeft <= 0) return false;
    return true;
  }, [activity, isOrganizer]);

  const canLeave = useMemo(() => {
    if (!activity) return false;
    if (!isOrganizer && activity.myRole === 'PARTICIPANT') return true;
    return false;
  }, [activity, isOrganizer]);

  const onJoin = async () => {
    if (!id || !token || actionLock.current) return;
    actionLock.current = true;
    setActionBusy(true);
    setError(null);
    try {
      await joinActivity(token, id);
      setActivity(await getActivity(token, id));
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(e.code === 'CAPACITY_BELOW_PARTICIPANTS' ? 'Лимит не может быть меньше текущего числа участников.' : e.code === 'INVALID_ACTIVITY' ? 'Проверьте название, вид спорта, будущую дату и лимит участников.' : `${e.code}: ${e.message}`);
      } else {
        setError('Join failed');
      }
    } finally {
      actionLock.current = false;
      setActionBusy(false);
    }
  };

   const onLeave = async () => {
     if (!id || !token || !activity || actionLock.current) return;
     actionLock.current = true;
     setActionBusy(true);
     setError(null);
     try {
       await leaveActivity(token, id);
       setActivity(await getActivity(token, id));
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(e.code === 'CAPACITY_BELOW_PARTICIPANTS' ? 'Лимит не может быть меньше текущего числа участников.' : e.code === 'INVALID_ACTIVITY' ? 'Проверьте название, вид спорта, будущую дату и лимит участников.' : `${e.code}: ${e.message}`);
       } else {
         setError('Leave failed');
       }
     } finally {
       actionLock.current = false;
      setActionBusy(false);
     }
   };

   const onEdit = async () => {
     if (!activity || !isOrganizer) return;
     setEditData({
       title: activity.title,
       sport: activity.sport,
       lat: activity.lat,
       lon: activity.lon,
       address: activity.address,
       date: activity.date,
       maxParticipants: activity.maxParticipants,
       description: activity.description,
     });
     setEditCapacityValid(true);
     setError(null);
     setShowEditModal(true);
   };

   const onSaveEdit = async () => {
     if (!id || !token || !activity || !isOrganizer || !editData || !editCapacityValid || actionLock.current) return;
     actionLock.current = true;
     setActionBusy(true);
     setError(null);
     try {
       const changes = Object.fromEntries(Object.entries(editData).filter(([key, value]) =>
         value !== activity[key as keyof ActivityDetail])) as UpdateActivityInput;
       await updateActivity(token, id, changes);
       setActivity(await getActivity(token, id));
       setShowEditModal(false);
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(e.code === 'CAPACITY_BELOW_PARTICIPANTS' ? 'Лимит не может быть меньше текущего числа участников.' : e.code === 'INVALID_ACTIVITY' ? 'Проверьте название, вид спорта, будущую дату и лимит участников.' : `${e.code}: ${e.message}`);
       } else {
         setError('Update failed');
       }
     } finally {
       actionLock.current = false;
      setActionBusy(false);
     }
   };

   const onReport = async () => {
     if (!id || !token || !reportReason.trim() || actionLock.current) return;
     actionLock.current = true;
     setActionBusy(true);
     setError(null);
     try {
       await reportActivity(token, {
         activityId: id,
         reason: reportReason.trim(),
       });
       setShowReportModal(false);
       setReportReason('');
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(e.code === 'CAPACITY_BELOW_PARTICIPANTS' ? 'Лимит не может быть меньше текущего числа участников.' : e.code === 'INVALID_ACTIVITY' ? 'Проверьте название, вид спорта, будущую дату и лимит участников.' : `${e.code}: ${e.message}`);
       } else {
         setError('Report failed');
       }
     } finally {
       actionLock.current = false;
      setActionBusy(false);
     }
   };

  if (!activity) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ padding: 2 }}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
            <Text style={styles.headerTitle}>Подробный обзор</Text>
          </View>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {busy ? "Загружаю…" : "Активность не найдена"}
          </Text>
          <Text style={styles.emptyText}>
            {error ? error : "Вернитесь в список и выберите другую."}
          </Text>
          <View style={{ height: 16 }} />
          <PrimaryButton title="К списку" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{ padding: 2 }}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>Подробный обзор</Text>
        </View>
        <StatusBadge status={activity.status} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap} />

        <View style={styles.titleRow}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          <View style={styles.sportIconWrap}>
            <SportIcon sport={activity.sport} size={24} color={COLORS.surface} />
          </View>
        </View>

        {organizer && (
          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatar}>
              {organizer.avatarUrl ? (
                <Image
                  source={{ uri: organizer.avatarUrl }}
                  style={{ width: 50, height: 50, borderRadius: 25 }}
                />
              ) : (
                <MaterialIcons name="person" size={30} color={COLORS.textSecondary} />
              )}
            </View>
            <View style={styles.creatorAbout}>
              <View style={styles.creatorInline}>
                <Text style={styles.creatorName}>{organizer.username}</Text>
                <View style={styles.bullet} />
                <Text style={styles.creatorRole}>организатор</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.description}>{activity.description || ""}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="event" size={20} color={COLORS.surface} />
          </View>
          <View style={styles.infoTextWrap}>
            <View style={styles.infoInline}>
              <Text style={styles.infoPrimary}>{startsAt?.long ?? ""}</Text>
              <View style={styles.bulletSmall} />
              <Text style={styles.infoSecondary}>{startsAt?.time ?? ""}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconWrap}>
            <MaterialIcons name="place" size={20} color={COLORS.surface} />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoPrimary}>{activity.address}</Text>
          </View>
        </View>

        <View style={styles.participantsBlock}>
          <Text style={styles.participantsTitle}>
            Участники ({activity.participants.length})
          </Text>
          {participantProfiles.length > 0 && (
            <View style={styles.avatarStackWrap}>
              <AvatarStack
                participants={participantProfiles.map(p => ({
                  id: p.userId,
                  name: p.username,
                  avatarUrl: p.avatarUrl || '',
                }))}
                size={54}
                max={3}
              />
            </View>
          )}
          <Text style={styles.spotsText}>
            {activity.maxParticipants === 0 ? 'Без ограничений по числу участников' : `Осталось мест: ${Math.max(activity.spotsLeft, 0)} из ${activity.maxParticipants}`}
          </Text>
        </View>

         <View style={styles.buttonsRow}>
           <View style={styles.buttonCol}>
             <PrimaryButton
               title={isOrganizer ? "Вы организатор" : activity.myRole ? "Вы участник" : actionBusy ? "…" : "Присоединиться"}
               onPress={onJoin}
               disabled={!canJoin || actionBusy}
             />
           </View>
           <View style={styles.buttonCol}>
             {isOrganizer ? (
               <PrimaryButton
                 title={actionBusy ? "…" : "Редактировать"}
                 onPress={onEdit}
                 disabled={actionBusy}
               />
             ) : (
               <SecondaryButton
                 title={actionBusy ? "…" : "Пожаловаться"}
                 onPress={() => { setError(null); setShowReportModal(true); }}
                 disabled={actionBusy}
               />
             )}
           </View>
           <View style={styles.buttonCol}>
             {canLeave ? (
               <SecondaryButton
                 title={actionBusy ? "…" : "Покинуть"}
                 onPress={onLeave}
                 disabled={actionBusy}
               />
             ) : (
               <SecondaryButton
                 title="Не показывать"
                 onPress={() => router.back()}
               />
             )}
           </View>
         </View>

        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Edit Activity Modal */}
        {showEditModal ? (
          <Modal visible transparent animationType="slide" onRequestClose={() => { if (!actionBusy) setShowEditModal(false); }}>
          <View style={styles.modalOverlay}>
            <View testID="edit-dialog" style={styles.modalContent} accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Редактировать активность</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Закрыть редактирование" disabled={actionBusy} onPress={() => setShowEditModal(false)} style={styles.modalClose}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TextInput
                  placeholder="Название"
                  value={editData?.title || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, title: text} : null)}
                  style={styles.modalInput}
                  autoCapitalize="words"
                />
                <TextInput
                  placeholder="Вид спорта"
                  value={editData?.sport || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, sport: text} : null)}
                  style={styles.modalInput}
                />
                <TextInput
                  placeholder="Широта (lat)"
                  value={editData?.lat?.toString() || ''}
                  onChangeText={text => {
                    const num = parseFloat(text);
                    setEditData(prev => prev ? {...prev, lat: isNaN(num) ? 0 : num} : null);
                  }}
                  style={styles.modalInput}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Долгота (lon)"
                  value={editData?.lon?.toString() || ''}
                  onChangeText={text => {
                    const num = parseFloat(text);
                    setEditData(prev => prev ? {...prev, lon: isNaN(num) ? 0 : num} : null);
                  }}
                  style={styles.modalInput}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Адрес"
                  value={editData?.address || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, address: text} : null)}
                  style={styles.modalInput}
                />
                {editData && <ScheduleInput date={new Date(editData.date)} time={(() => {
                  const date = new Date(editData.date);
                  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                })()} quickDays={false} disabled={actionBusy} onChange={(date, time) => {
                  const next = scheduleDate(date, time);
                  if (next) setEditData(prev => prev ? { ...prev, date: next.toISOString() } : null);
                }} />}
                <CapacityInput value={editData?.maxParticipants ?? 10} disabled={actionBusy} onValidityChange={setEditCapacityValid}
                  onChange={maxParticipants => setEditData(prev => prev ? { ...prev, maxParticipants } : null)} />
                <TextInput
                  placeholder="Описание"
                  value={editData?.description || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, description: text} : null)}
                  style={styles.modalInputMultiline}
                  multiline
                />
              </ScrollView>
              {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Отмена"
                  onPress={() => setShowEditModal(false)}
                  disabled={actionBusy}
                />
                <PrimaryButton
                  title="Сохранить"
                  onPress={onSaveEdit}
                  loading={actionBusy}
                  disabled={!editCapacityValid || !editData || (editData.date !== activity.date &&
                    (!Number.isFinite(new Date(editData.date).getTime()) || new Date(editData.date).getTime() <= Date.now()))}
                />
              </View>
            </View>
          </View>
          </Modal>
        ) : null}

        {/* Report Activity Modal */}
        {showReportModal ? (
          <Modal visible transparent animationType="slide" onRequestClose={() => { if (!actionBusy) setShowReportModal(false); }}>
          <View style={styles.modalOverlay}>
            <View testID="report-dialog" style={styles.modalContent} accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Пожаловаться на активность</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Закрыть жалобу" disabled={actionBusy} onPress={() => setShowReportModal(false)} style={styles.modalClose}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text>
                  Пожалуйста, укажите причину жалобы на эту активность.
                </Text>
                <TextInput
                  placeholder="Причина жалобы"
                  maxLength={2000}
                  editable={!actionBusy}
                  value={reportReason}
                  onChangeText={setReportReason}
                  style={styles.modalInputMultiline}
                  multiline
                />
              </ScrollView>
              {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Отмена"
                  onPress={() => setShowReportModal(false)}
                  disabled={actionBusy}
                />
                <PrimaryButton
                  title="Отправить жалобу"
                  onPress={onReport}
                  loading={actionBusy}
                  disabled={!reportReason.trim() || reportReason.trim().length > 2000}
                />
              </View>
            </View>
          </View>
          </Modal>
        ) : null}
       </ScrollView>
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroWrap: {
    height: 210,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.divider,
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.4,
    borderColor: COLORS.surface,
    backgroundColor: COLORS.divider,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  creatorAbout: {
    flex: 1,
    justifyContent: "center",
  },
  creatorInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  creatorName: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  creatorRole: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.ink,
  },
  description: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  infoRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  infoInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  infoPrimary: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  infoSecondary: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  bulletSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.ink,
  },
  participantsBlock: {
    marginTop: 12,
    gap: 5,
  },
  participantsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  avatarStackWrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  buttonsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: 'wrap',
    alignItems: "stretch",
    gap: 12,
  },
  buttonCol: {
    flex: 1,
    flexBasis: 150,
    minWidth: 150,
  },
  moreWrap: {
    marginTop: 22,
  },
  moreTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyWrap: {
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  errorWrap: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
   errorText: {
     fontSize: 12,
     fontWeight: '600',
     color: COLORS.textPrimary,
   },

   // Modal styles
   modalOverlay: {
     ...StyleSheet.absoluteFillObject,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
     justifyContent: 'center',
     alignItems: 'center',
   },
   modalContent: {
     width: '90%',
     maxWidth: 400,
     maxHeight: '90%',
     backgroundColor: COLORS.surface,
     borderRadius: 20,
   },
   modalHeader: {
     paddingHorizontal: 20,
     paddingVertical: 16,
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
   },
   modalTitle: {
     flex: 1,
     minWidth: 0,
     fontSize: 18,
     fontWeight: '600',
     color: COLORS.textPrimary,
   },
   modalClose: {
     flexShrink: 0,
     padding: 8,
   },
   modalBody: {
     paddingHorizontal: 20,
     paddingVertical: 16,
     gap: 12,
   },
   modalInput: {
     height: 46,
     borderRadius: 14,
     paddingHorizontal: 12,
     backgroundColor: COLORS.surface,
     color: COLORS.ink,
     borderWidth: 1,
     borderColor: BORDER,
     fontSize: 14,
     marginBottom: 12,
   },
   modalInputMultiline: {
     minHeight: 80,
     borderRadius: 14,
     paddingHorizontal: 12,
     paddingVertical: 12,
     backgroundColor: COLORS.surface,
     color: COLORS.ink,
     borderWidth: 1,
     borderColor: BORDER,
     fontSize: 14,
     marginBottom: 12,
     textAlignVertical: 'top',
   },
   modalActions: {
     flexDirection: 'column',
     paddingHorizontal: 20,
     paddingVertical: 16,
     gap: 12,
   },
 });
