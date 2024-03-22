"use client";


import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "../components/ui/scroll-area";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Textarea } from "../components/ui/textarea";
import { Button } from "@/components/ui/button"

export interface Message {
  role: string;
  content: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // Add the signal to the fetch options
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id); // Clear the timeout if the fetch completes in time
    return response; // Proceed with handling the response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Handle fetch request being aborted due to timeout
      throw new Error('Fetch request timed out');
    } else {
      // Rethrow any other errors
      throw error;
    }
  }
}


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [shiftKeyHeld, setShiftKeyHeld] = useState(false);

  const editPromptRef = useRef<HTMLTextAreaElement>(null);

  const handleEdit = async () => {
    if (editPromptRef.current) {
      console.log(`prompt: ${editPromptRef.current.value}`);
      
      try {
        console.log('Making call to OPEN AI');
        const response = await fetchWithTimeout('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: editPromptRef.current.value,
            conversation: messages.filter((_, index) => selectedMessages.includes(index)),
          }),
        });
        console.log(`response: ${JSON.stringify(response, null, 2)}`)
        console.log('PROBABLY DID NOT REACH HERE');

        // selectedMessages.map(messageIndex => messages[messageIndex])
        if (response.status != 200) {
          console.error('Response was not 200');
          throw response.body;
        }

        if (!response.ok) {
          throw new Error('Response was not okay');
        }
        console.log('response was okay');
        console.log("ABout to process response")
        const data = await response.json();
        console.log(`data: ${data}`);
        console.log(`response data: ${JSON.stringify(data, null, 2)}`);
        
        // We successfully get data back, unselect the messages
        setSelectedMessages([]);

        // Remove the original version of the edited conversation
        const uneditedConversation = messages.filter((_, index) => !selectedMessages.includes(index));
        const editStartIndex = Math.min(...selectedMessages);
        const newConversation = [
          ...uneditedConversation.slice(0, editStartIndex),
          ...data,
          ...uneditedConversation.slice(editStartIndex)
        ];
        setMessages(newConversation);
      } catch (error) {
        console.log('SHOULD HAVE ARRIVED HERE AFTER ATTEMPTING OPEN AI CALL');
        console.error(`Error: ${error}`);
        console.error(`An error occurred while fetching edits: ${JSON.stringify(error, null, 2)}`);
      }
    }
  }

  const handleSelectMessage = (index: number) => {
    if (shiftKeyHeld && selectedMessages.length > 0) {
      const start = Math.min(index, ...selectedMessages);
      const end = Math.max(index, ...selectedMessages);
      setSelectedMessages(Array.from({ length: end - start + 1 }, (_, i) => start + i));
    } else {
      if (selectedMessages.includes(index) && selectedMessages.length === 1) {
        // If the clicked message is the only selected one, deselect it
        setSelectedMessages([]);
      } else if (selectedMessages.includes(index)) {
        // If clicking a selected message within a range, deselect everything except this message
        setSelectedMessages([index]);
      } else {
        // Select the clicked message
        setSelectedMessages([index]);
      }
    }
  };

  useEffect(() => {
    fetch('/messages.json') // Assuming your file is located at public/messages.json
      .then(response => response.json())
      .then(data => {
        // Optionally, validate the data here
        const loadedMessages: Message[] = data; // Assuming the data is in the correct format
        setMessages(loadedMessages);
      })
      .catch(error => console.error("Failed to load messages:", error));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyHeld(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKeyHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <section className="flex flex-col h-screen p-4 bg-gray-200 text-black justify-center items-center" tabIndex={0}>
      <div className="flex flex-col h-3/4 max-w-4xl w-full">
        <h1 className="text-3xl text-center mb-4 text-gray-800">Dataset Cleaner</h1>
        <div className="flex-grow bg-gray-100 rounded-lg overflow-hidden p-2">
          <ScrollArea className="bg-gray-100 rounded-lg overflow-hidden w-full h-full">
            <div className="flex flex-col gap-y-4">
              {messages.map((message, index) => (
                <p
                  key={index}
                  className={`break-words ${selectedMessages.includes(index) ? 'bg-gray-300' : ''}`}
                  onClick={() => handleSelectMessage(index)}
                >
                  <span className={`font-bold ${message.role === "user" ? 'text-green-500' : 'text-blue-500'} bg-blue-100 bg-opacity-50 rounded px-1`}>
                    {message.role}:
                  </span>
                  <span className="text-gray-600">{message.content}</span>
                </p>
              ))}
            </div>
          </ScrollArea>
        </div>
        <Popover>
          <PopoverTrigger className='bg-white rounded mt-4 px-2 font-bold'>Edit</PopoverTrigger>
          <PopoverContent style={{ width: '900px', height: '200px' }} className='bg-white'>
            <div className="w-full h-3/4">
              <Textarea ref={editPromptRef} className='w-full h-full p-2' placeholder="Enter editing instructions here..."/>
            </div>
            <Button onClick={handleEdit} variant='outline' className='rounded px-2 mt-4 w-full'>Enter</Button>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}