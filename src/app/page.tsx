'use client';

import {generateResponse} from '@/ai/flows/generate-response';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {ScrollArea} from '@/components/ui/scroll-area';
import {useEffect, useRef, useState} from 'react';
import {cn} from '@/lib/utils';
import {Upload} from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  image?: string; // Optional image data URL
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Store image data URL
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the chat container when new messages are added
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string); // Store the data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      text: input,
      isUser: true,
      image: selectedImage || undefined, // Include image if available
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setSelectedImage(null); // Clear the selected image after sending
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
    setIsLoading(true);

    try {
      // Extract chat history from the current messages state
      const chatHistory = messages;

      const aiResponse = await generateResponse({message: input, chatHistory: chatHistory, image: selectedImage || ''});

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        text: aiResponse.response,
        isUser: false,
        image: undefined,
      };

      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Generic error message
      const errorMessage =
        error.message || 'Failed to get response from AI. Please try again.';

      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString() + '-error',
          text: `Error: ${errorMessage}`,
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left side (content area) */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <ScrollArea className="h-full">
              <div ref={chatContainerRef} className="space-y-4 flex w-full flex-col">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-2xl rounded-lg px-4 py-2',
                      message.isUser
                        ? 'bg-primary text-primary-foreground self-start'
                        : 'bg-secondary text-secondary-foreground self-end'
                    )}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="mb-2 max-h-48 max-w-full rounded-md"
                      />
                    )}
                    {message.text}
                  </div>
                ))}
                {isLoading && (
                  <div className="max-w-2xl rounded-lg px-4 py-2 bg-muted text-muted-foreground self-end">
                    Thinking...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          {/* Input area */}
          <div className="p-4 sm:p-6 border-t border-border">
            <div className="flex items-center space-x-4">

              <Textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // Prevent newline
                    handleSendMessage();
                  }
                }}
              />
              <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    ref={fileInputRef}
                  />
                  <label htmlFor="image-upload">
                    <Button variant="secondary" size="sm" asChild>
                      <Upload className="h-4 w-4"/>
                    </Button>
                  </label>

                </div>
              <Button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </div>
             {selectedImage && (
              <div className="mt-2">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-h-48 max-w-full rounded-md"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side (optional sidebar) */}
      <div className="w-80 border-l border-border p-4 sm:p-6 bg-secondary">
        {/* Add sidebar content here */}
        <h2 className="text-lg font-semibold mb-4">Sidebar</h2>
        <p className="text-sm text-muted-foreground">
          This is an example sidebar. You can add any content here.
        </p>
      </div>
    </div>
  );
}
