import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CursorPosition {
  lineNumber: number;
  column: number;
}

interface Collaborator {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  cursor_position: CursorPosition | null;
  active_file: string | null;
  color: string;
}

export function useCollaboration(projectId: string, currentUserId: string, activeFile: string | null) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const userColors = [
    'hsl(210, 100%, 60%)', // blue
    'hsl(340, 75%, 60%)',  // pink
    'hsl(160, 75%, 50%)',  // green
    'hsl(40, 100%, 60%)',  // orange
    'hsl(280, 75%, 60%)',  // purple
  ];

  useEffect(() => {
    if (!projectId || !currentUserId) return;

    updateMySession();
    fetchCollaborators();

    // Update session periodically
    const sessionInterval = setInterval(updateMySession, 5000);

    // Subscribe to collaboration changes
    const channel = supabase
      .channel(`collab-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_sessions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchCollaborators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(sessionInterval);
      clearDecorations();
    };
  }, [projectId, currentUserId, activeFile]);

  const updateMySession = async () => {
    if (!activeFile) return;

    const cursorPosition = editorRef.current?.getPosition();

    const sessionData = {
      project_id: projectId,
      user_id: currentUserId,
      active_file: activeFile,
      cursor_position: cursorPosition ? {
        lineNumber: cursorPosition.lineNumber,
        column: cursorPosition.column,
      } : null,
      last_seen: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('collaboration_sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', currentUserId)
      .single();

    if (existing) {
      await supabase
        .from('collaboration_sessions')
        .update(sessionData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('collaboration_sessions')
        .insert(sessionData);
    }
  };

  const fetchCollaborators = async () => {
    const { data: sessions } = await supabase
      .from('collaboration_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('active_file', activeFile || '')
      .neq('user_id', currentUserId)
      .gte('last_seen', new Date(Date.now() - 30000).toISOString());

    if (!sessions) return;

    // Fetch profiles
    const userIds = sessions.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const collabsWithProfiles = sessions.map((session, index) => {
      let cursorPos: CursorPosition | null = null;
      if (session.cursor_position && typeof session.cursor_position === 'object' && 'lineNumber' in session.cursor_position) {
        cursorPos = session.cursor_position as unknown as CursorPosition;
      }
      
      return {
        id: session.id,
        user_id: session.user_id,
        username: profiles?.find(p => p.user_id === session.user_id)?.username || 'Anonymous',
        avatar_url: profiles?.find(p => p.user_id === session.user_id)?.avatar_url || '',
        cursor_position: cursorPos,
        active_file: session.active_file,
        color: userColors[index % userColors.length],
      };
    });

    setCollaborators(collabsWithProfiles);
    updateCursorDecorations(collabsWithProfiles);
  };

  const updateCursorDecorations = (collabs: Collaborator[]) => {
    if (!editorRef.current) return;

    clearDecorations();

    const newDecorations: any[] = [];

    collabs.forEach((collab) => {
      if (!collab.cursor_position) return;

      const { lineNumber, column } = collab.cursor_position;

      // Add cursor decoration
      newDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column + 1,
        },
        options: {
          className: 'collab-cursor',
          stickiness: 1,
          beforeContentClassName: 'collab-cursor-label',
          hoverMessage: { value: `${collab.username} is here` },
          glyphMarginClassName: 'collab-glyph',
          zIndex: 1000,
          inlineClassName: 'collab-cursor-inline',
        },
      });
    });

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  };

  const clearDecorations = () => {
    if (editorRef.current && decorationsRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }
  };

  const setEditor = (editor: any) => {
    editorRef.current = editor;

    // Track cursor changes
    editor.onDidChangeCursorPosition(() => {
      updateMySession();
    });
  };

  return {
    collaborators,
    setEditor,
  };
}