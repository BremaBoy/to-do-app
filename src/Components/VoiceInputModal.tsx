import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { voiceService } from '../Services/VoiceService';

interface VoiceInputModalProps {
  visible: boolean;
  onClose: () => void;
  onTasksCreated: (tasks: string[]) => void;
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, pulseAnim]);

  const startTimer = () => {
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const duration = Date.now() - startTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      setRecordTime(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        const permission = await requestPermission();
        if (permission.status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant microphone permission to use voice input.');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      setIsRecording(true);
      setRecordTime('00:00');
      startTimer();
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    console.log('Stopping recording..');
    setRecording(null); // Clear state early
    setIsRecording(false);
    stopTimer();
    
    if (!recording) {
        return;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI(); 
      console.log('Recording stopped and stored at', uri);

      if (!uri) {
        Alert.alert('Error', 'No recording found');
        return;
      }

      setIsProcessing(true);

      // Transcribe audio using OpenAI Whisper
      const transcribedText = await voiceService.transcribeAudio(uri);
      console.log('Transcribed text:', transcribedText);

      if (!voiceService.isValidTranscription(transcribedText)) {
        Alert.alert(
          'No Speech Detected',
          'Could not understand the audio. Please try again.'
        );
        setIsProcessing(false);
        return;
      }

      // Split into individual tasks
      const tasks = voiceService.splitIntoTasks(transcribedText);
      console.log('Split tasks:', tasks);

      if (tasks.length === 0) {
        Alert.alert(
          'No Tasks Found',
          'Could not extract tasks from the audio. Please try again.'
        );
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
      onTasksCreated(tasks);
      onClose();

      // Show success message
      Alert.alert(
        'Success',
        `Added ${tasks.length} task${tasks.length > 1 ? 's' : ''} from voice input!`
      );
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
      Alert.alert(
        'Processing Error',
        'Failed to process voice input. Please try again or check your internet connection.'
      );
    }
  };

  const handleClose = async () => {
    if (isRecording && recording) {
      Alert.alert(
        'Cancel Recording',
        'Are you sure you want to cancel the recording?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              stopTimer();
              try {
                  await recording.stopAndUnloadAsync();
              } catch (e) {
                  console.error('Error unloading recording on close', e);
              }
              setRecording(null);
              setIsRecording(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

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
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.processingText, darkMode && styles.textDark]}>
                Processing your voice...
              </Text>
              <Text style={[styles.processingSubtext, darkMode && styles.subtextDark]}>
                This may take a few seconds
              </Text>
            </View>
          ) : (
            <>
              <Animated.View
                style={[
                  styles.micButtonContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    isRecording
                      ? styles.micButtonRecording
                      : styles.micButtonIdle,
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <Feather
                    name={isRecording ? 'square' : 'mic'}
                    size={48}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={[styles.recordingText, darkMode && styles.textDark]}>
                    {recordTime}
                  </Text>
                </View>
              )}

              <Text style={[styles.instructionText, darkMode && styles.textDark]}>
                {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
              </Text>

              <Text style={[styles.hintText, darkMode && styles.subtextDark]}>
                Speak naturally: "Buy groceries and call mom and schedule dentist"
              </Text>

              <View style={styles.examplesContainer}>
                <Text style={[styles.examplesTitle, darkMode && styles.subtextDark]}>
                  Tips:
                </Text>
                <Text style={[styles.exampleText, darkMode && styles.subtextDark]}>
                  • Say "and" between tasks
                </Text>
                <Text style={[styles.exampleText, darkMode && styles.subtextDark]}>
                  • Speak clearly
                </Text>
                <Text style={[styles.exampleText, darkMode && styles.subtextDark]}>
                  • Keep it under 60 seconds
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isProcessing}
          >
            <Text style={styles.closeText}>
              {isProcessing ? 'Please wait...' : 'Cancel'}
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
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 320,
    maxWidth: '90%',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
    marginBottom: 8,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  examplesContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 16,
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