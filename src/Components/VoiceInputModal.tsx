import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

import {
  voiceService,
  ParsedVoiceTask,
} from '../Services/VoiceService';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onTasksCreated: (tasks: ParsedVoiceTask[]) => void;
  darkMode: boolean;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  visible,
  onClose,
  onTasksCreated,
  darkMode,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  /**
   * expo-audio recorder
   */
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  /**
   * Start/stop pulse animation
   */
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => {
        animation.stop();
      };
    }

    pulseAnim.setValue(1);
  }, [isRecording, pulseAnim]);

  /**
   * Recording timer
   */
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    recordingStartTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      if (!recordingStartTimeRef.current) {
        return;
      }

      const elapsed = Date.now() - recordingStartTimeRef.current;

      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setRecordTime(
        `${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      );
    }, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  /**
   * Reset timer
   */
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    recordingStartTimeRef.current = null;
    setRecordTime('00:00');
  };

  /**
   * Start recording
   */
  const startRecording = async () => {
    try {
      console.log('[Voice] Requesting microphone permission...');

      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please allow microphone access in your iPhone Settings to use voice input.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('[Voice] Microphone permission granted');

      /**
       * Configure audio mode
       */
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      /**
       * Reset timer before starting
       */
      resetTimer();

      console.log('[Voice] Preparing recorder...');

      await audioRecorder.prepareToRecordAsync();

      console.log('[Voice] Starting recorder...');

      audioRecorder.record();

      setIsRecording(true);

      console.log('[Voice] Recording started');
    } catch (error) {
      console.error('[Voice] Failed to start recording:', error);

      setIsRecording(false);
      resetTimer();

      Alert.alert(
        'Recording Error',
        'Unable to start recording. Please make sure microphone permission is enabled.'
      );
    }
  };

  /**
   * Stop recording and process audio
   */
  const stopRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      console.log('[Voice] Stopping recording...');

      setIsRecording(false);
      resetTimer();

      await audioRecorder.stop();

      console.log('[Voice] Recording stopped');

      const uri = audioRecorder.uri;

      console.log('[Voice] Recording URI:', uri);

      if (!uri) {
        Alert.alert(
          'Recording Error',
          'No audio file was created. Please try recording again.'
        );
        return;
      }

      setIsProcessing(true);

      console.log('[Voice] Sending audio for transcription...');

      /**
       * Send audio to Groq Whisper
       */
      const transcribedText = await voiceService.transcribeAudio(uri);

      console.log('[Voice] Transcription:', transcribedText);

      if (!voiceService.isValidTranscription(transcribedText)) {
        setIsProcessing(false);

        Alert.alert(
          'No Speech Detected',
          'We could not understand your recording. Please speak clearly and try again.'
        );

        return;
      }

      /**
       * Split transcription into individual tasks
       */
      const tasks = voiceService.parseVoiceTasks(transcribedText);

      console.log('[Voice] Generated tasks:', tasks);

      if (tasks.length === 0) {
        setIsProcessing(false);

        Alert.alert(
          'No Tasks Found',
          'We could not find any tasks in your recording. Please try again.'
        );

        return;
      }

      /**
       * Finish processing
       */
      setIsProcessing(false);

      onTasksCreated(tasks);

      onClose();

      Alert.alert(
        'Tasks Added',
        `Added ${tasks.length} task${tasks.length === 1 ? '' : 's'} from your voice input.`
      );
    } catch (error) {
      console.error('[Voice] Error processing recording:', error);

      setIsProcessing(false);

      Alert.alert(
        'Processing Error',
        'Failed to process your voice recording. Please check your internet connection and try again.'
      );
    }
  };

  /**
   * Cancel active recording
   */
  const cancelRecording = async () => {
    try {
      console.log('[Voice] Cancelling recording...');

      setIsRecording(false);
      resetTimer();

      await audioRecorder.stop();

      console.log('[Voice] Recording cancelled');
    } catch (error) {
      console.error('[Voice] Error cancelling recording:', error);
    }
  };

  /**
   * Close modal
   */
  const handleClose = () => {
    if (isProcessing) {
      return;
    }

    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to cancel this recording?',
        [
          {
            text: 'Keep Recording',
            style: 'cancel',
          },
          {
            text: 'Cancel Recording',
            style: 'destructive',
            onPress: async () => {
              await cancelRecording();
              onClose();
            },
          },
        ]
      );

      return;
    }

    resetTimer();
    onClose();
  };

  /**
   * Reset state whenever modal closes
   */
  useEffect(() => {
    if (!visible && !isRecording && !isProcessing) {
      resetTimer();
    }
  }, [visible, isRecording, isProcessing]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, darkMode && styles.modalDark]}>
          {isProcessing ? (
            /**
             * Processing UI
             */
            <View style={styles.processingContainer}>
              <ActivityIndicator
                size="large"
                color="#3B82F6"
              />

              <Text
                style={[
                  styles.processingText,
                  darkMode && styles.textDark,
                ]}
              >
                Processing your voice...
              </Text>

              <Text
                style={[
                  styles.processingSubtext,
                  darkMode && styles.subtextDark,
                ]}
              >
                Transcribing your recording and creating tasks.
              </Text>
            </View>
          ) : (
            <>
              {/* Microphone */}
              <Animated.View
                style={[
                  styles.micButtonContainer,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    isRecording
                      ? styles.micButtonRecording
                      : styles.micButtonIdle,
                  ]}
                  onPress={
                    isRecording
                      ? stopRecording
                      : startRecording
                  }
                  activeOpacity={0.8}
                >
                  <Feather
                    name={isRecording ? 'square' : 'mic'}
                    size={42}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Recording indicator */}
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />

                  <Text
                    style={[
                      styles.recordingText,
                      darkMode && styles.textDark,
                    ]}
                  >
                    {recordTime}
                  </Text>
                </View>
              )}

              {/* Main instruction */}
              <Text
                style={[
                  styles.instructionText,
                  darkMode && styles.textDark,
                ]}
              >
                {isRecording
                  ? 'Tap to stop recording'
                  : 'Tap the microphone to start'}
              </Text>

              {/* Voice example */}
              <Text
                style={[
                  styles.hintText,
                  darkMode && styles.subtextDark,
                ]}
              >
                Try saying:
                {'\n'}
                "Buy groceries and call mom and schedule dentist"
              </Text>

              {/* Tips */}
              <View
                style={[
                  styles.examplesContainer,
                  darkMode && styles.examplesContainerDark,
                ]}
              >
                <Text
                  style={[
                    styles.examplesTitle,
                    darkMode && styles.subtextDark,
                  ]}
                >
                  Voice Input Tips
                </Text>

                <Text
                  style={[
                    styles.exampleText,
                    darkMode && styles.subtextDark,
                  ]}
                >
                  • Speak naturally
                </Text>

                <Text
                  style={[
                    styles.exampleText,
                    darkMode && styles.subtextDark,
                  ]}
                >
                  • Say "and" between separate tasks
                </Text>

                <Text
                  style={[
                    styles.exampleText,
                    darkMode && styles.subtextDark,
                  ]}
                >
                  • Speak clearly for better transcription
                </Text>

                <Text
                  style={[
                    styles.exampleText,
                    darkMode && styles.subtextDark,
                  ]}
                >
                  • Keep recordings under 60 seconds
                </Text>
              </View>
            </>
          )}

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isProcessing}
          >
            <Text style={styles.closeText}>
              {isProcessing
                ? 'Please wait...'
                : isRecording
                ? 'Cancel'
                : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
  },

  modalDark: {
    backgroundColor: '#1F2937',
  },

  micButtonContainer: {
    marginBottom: 20,
  },

  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  micButtonIdle: {
    backgroundColor: '#3B82F6',
  },

  micButtonRecording: {
    backgroundColor: '#EF4444',
  },

  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },

  recordingText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },

  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },

  hintText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  examplesContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },

  examplesContainerDark: {
    backgroundColor: '#111827',
  },

  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },

  exampleText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 5,
    lineHeight: 19,
  },

  processingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    minHeight: 220,
    justifyContent: 'center',
  },

  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },

  processingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  closeButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  closeText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },

  textDark: {
    color: '#F9FAFB',
  },

  subtextDark: {
    color: '#9CA3AF',
  },
});