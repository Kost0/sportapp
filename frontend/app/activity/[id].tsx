import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
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
import type { ActivityDetail } from "@/lib/api/activities";
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

  const { token, logout } = useAuth();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [organizer, setOrganizer] = useState<PublicProfile | null>(null);
  const [participantProfiles, setParticipantProfiles] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
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

  const startsAt = useMemo(
    () => (activity ? formatStartsAt(activity.date) : null),
    [activity]
  );

  useEffect(() => {
    if (!id || !token) return;

    let cancelled = false;
    setBusy(true);
    setError(null);

    getActivity(token, id)
      .then((res) => {
        if (cancelled) return;
        setActivity(res);
        
        // Load organizer profile
        return getProfileById(token, res.organizerId);
      })
      .then((profile) => {
        if (cancelled) return;
        if (profile) setOrganizer(profile);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          if (e.status === 401) logout();
          setError(`${e.code}: ${e.message}`);
        } else {
          setError('Failed to load activity');
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
        getProfileById(token, p.userId).catch(() => null)
      )
    )
      .then((profiles) => {
        if (cancelled) return;
        setParticipantProfiles(profiles.filter((p): p is PublicProfile => p !== null));
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
    if (activity.status !== 'OPEN') return false;
    if (activity.myRole) return false;
    if (activity.spotsLeft <= 0) return false;
    return true;
  }, [activity]);

  const canLeave = useMemo(() => {
    if (!activity) return false;
    if (activity.myRole === 'PARTICIPANT') return true;
    return false;
  }, [activity]);

  const onJoin = async () => {
    if (!id || !token) return;
    setActionBusy(true);
    setError(null);
    try {
      const res = await joinActivity(token, id);
      setActivity((prev) =>
        prev
          ? {
              ...prev,
              spotsLeft: res.spotsLeft,
              version: res.activityVersion,
              myRole: res.myRole,
            }
          : prev
      );
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) logout();
        setError(`${e.code}: ${e.message}`);
      } else {
        setError('Join failed');
      }
    } finally {
      setActionBusy(false);
    }
  };

   const onLeave = async () => {
     if (!id || !token || !activity) return;
     setActionBusy(true);
     setError(null);
     try {
       await leaveActivity(token, id);
       // Backend returns void, update state locally
       setActivity((prev) =>
         prev
           ? {
               ...prev,
               spotsLeft: prev.spotsLeft + 1,
               myRole: null,
             }
           : prev
       );
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(`${e.code}: ${e.message}`);
       } else {
         setError('Leave failed');
       }
     } finally {
       setActionBusy(false);
     }
   };

   const onEdit = async () => {
     if (!activity) return;
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
     setShowEditModal(true);
   };

   const onSaveEdit = async () => {
     if (!id || !token || !activity || !editData) return;
     setActionBusy(true);
     setError(null);
     try {
       const res = await updateActivity(
         token,
         id,
         activity.organizerId,
         editData
       );
       // Update activity with new data
       setActivity((prev) =>
         prev
           ? {
               ...prev,
               title: editData.title,
               sport: editData.sport,
               lat: editData.lat,
               lon: editData.lon,
               address: editData.address,
               date: editData.date,
               maxParticipants: editData.maxParticipants,
               description: editData.description,
               version: res.version,
             }
           : prev
       );
       setShowEditModal(false);
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(`${e.code}: ${e.message}`);
       } else {
         setError('Update failed');
       }
     } finally {
       setActionBusy(false);
     }
   };

   const onReport = async () => {
     if (!id || !token) return;
     setActionBusy(true);
     setError(null);
     try {
       await reportActivity(token, {
         activityId: id,
         reporterId: token, // Assuming token contains user ID for simplicity
         reason: reportReason,
       });
       setShowReportModal(false);
       setReportReason('');
     } catch (e: unknown) {
       if (e instanceof ApiError) {
         if (e.status === 401) logout();
         setError(`${e.code}: ${e.message}`);
       } else {
         setError('Report failed');
       }
     } finally {
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
          <Text style={styles.activityTitle}>{activity.sport}</Text>
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
            Осталось мест: {Math.max(activity.spotsLeft, 0)} из {activity.maxParticipants}
          </Text>
        </View>

         <View style={styles.buttonsRow}>
           <View style={styles.buttonCol}>
             <PrimaryButton
               title={activity.myRole ? "Вы участник" : actionBusy ? "…" : "Присоединиться"}
               onPress={onJoin}
               disabled={!canJoin || actionBusy}
             />
           </View>
           <View style={styles.buttonCol}>
             {activity.myRole === 'ORGANIZER' ? (
               <PrimaryButton
                 title={actionBusy ? "…" : "Редактировать"}
                 onPress={onEdit}
                 disabled={actionBusy}
               />
             ) : (
               <SecondaryButton
                 title={actionBusy ? "…" : "Пожаловаться"}
                 onPress={() => setShowReportModal(true)}
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Редактировать активность</Text>
                <Pressable onPress={() => setShowEditModal(false)} style={styles.modalClose}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                <TextInput
                  placeholder="Дата и время (YYYY-MM-DDTHH:mm:ss)"
                  value={editData?.date || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, date: text} : null)}
                  style={styles.modalInput}
                />
                <TextInput
                  placeholder="Макс. участников"
                  value={editData?.maxParticipants?.toString() || ''}
                  onChangeText={text => {
                    const num = parseInt(text, 10);
                    setEditData(prev => prev ? {...prev, maxParticipants: isNaN(num) ? 1 : num} : null);
                  }}
                  style={styles.modalInput}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Описание"
                  value={editData?.description || ''}
                  onChangeText={text => setEditData(prev => prev ? {...prev, description: text} : null)}
                  style={styles.modalInputMultiline}
                  multiline
                  minHeight={80}
                />
              </ScrollView>
              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Отмена"
                  onPress={() => setShowEditModal(false)}
                />
                <PrimaryButton
                  title="Сохранить"
                  onPress={onSaveEdit}
                />
              </View>
            </View>
          </View>
        ) : null}

        {/* Report Activity Modal */}
        {showReportModal ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Пожаловаться на активность</Text>
                <Pressable onPress={() => setShowReportModal(false)} style={styles.modalClose}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text>
                  Пожалуйста, укажите причину жалобы на эту активность.
                </Text>
                <TextInput
                  placeholder="Причина жалобы"
                  value={reportReason}
                  onChangeText={setReportReason}
                  style={styles.modalInputMultiline}
                  multiline
                  minHeight={100}
                />
              </ScrollView>
              <View style={styles.modalActions}>
                <SecondaryButton
                  title="Отмена"
                  onPress={() => setShowReportModal(false)}
                />
                <PrimaryButton
                  title="Отправить жалобу"
                  onPress={onReport}
                />
              </View>
            </View>
          </View>
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
    alignItems: "stretch",
    gap: 12,
  },
  buttonCol: {
    flex: 1,
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
     fontSize: 18,
     fontWeight: '600',
     color: COLORS.textPrimary,
   },
   modalClose: {
     padding: 8,
   },
   modalBody: {
     paddingHorizontal: 20,
     paddingVertical: 16,
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
     flexDirection: 'row',
     justifyContent: 'flex-end',
     paddingHorizontal: 20,
     paddingVertical: 16,
     gap: 12,
   },
 });
