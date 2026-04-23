import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { BRAND, RADIUS, SPACING, SHADOWS } from '../constants/brand';

export const ChatScreen = ({ t, config }) => {
  const [messages, setMessages] = useState([
    { id: '1', text: t('chat_welcome'), sender: 'ai', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch(process.env.EXPO_PUBLIC_AI_AGENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_AI_AGENT_KEY}`
        },
        body: JSON.stringify({
          model: process.env.EXPO_PUBLIC_AI_MODEL || 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres MeBot, el asistente de inventario de Nativo. Ayudas a los usuarios a consultar productos, stock y precios en Vendure. Sé conciso y profesional.' },
            ...messages.map(m => ({ 
                role: m.sender === 'ai' ? 'assistant' : 'user', 
                content: m.text 
            })),
            { role: 'user', content: userMessage.text }
          ]
        })
      });

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Error de conexión con MeBot. Revisa tu internet.',
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isAi = item.sender === 'ai';
    return (
      <View style={[styles.messageWrap, isAi ? styles.aiWrap : styles.userWrap]}>
        <View style={[styles.bubble, isAi ? styles.aiBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAi ? styles.aiText : styles.userText]}>
            {item.text}
          </Text>
          <Text style={styles.timeText}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.typingText}>{t('ai_thinking')}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat_placeholder')}
            placeholderTextColor={BRAND.placeholder}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Text style={styles.sendIcon}>🚀</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 20,
  },
  messageWrap: {
    marginVertical: 6,
    flexDirection: 'row',
    width: '100%',
  },
  aiWrap: {
    justifyContent: 'flex-start',
  },
  userWrap: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  aiBubble: {
    backgroundColor: BRAND.surfaceHigh,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  userBubble: {
    backgroundColor: BRAND.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiText: {
    color: BRAND.text,
  },
  userText: {
    color: '#fff',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    color: BRAND.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: BRAND.surface,
    borderTopWidth: 1,
    borderTopColor: BRAND.cardBorder,
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: BRAND.surfaceHigh,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: BRAND.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: BRAND.cardBorder,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.primary,
  },
  sendBtnDisabled: {
    backgroundColor: BRAND.surfaceHigh,
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
});
