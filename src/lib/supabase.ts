import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface LoginCredentials {
  username: string
  password: string
  docker_container_id: string
}

export async function getContainerIdByUsername(username: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .select('docker_container_id')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching container ID:', error);
      return null;
    }

    return data.docker_container_id;
  } catch (error) {
    console.error('Error fetching container ID:', error);
    return null;
  }
}

export async function checkUsernameExists(username: string) {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .select('username')
      .eq('username', username)
      .single();

    if (error) {
      // If error is not found error, throw it
      if (error.code !== 'PGRST116') {
        throw error;
      }
      // If not found, username doesn't exist
      return false;
    }

    // If we got data, username exists
    return true;
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
}

export async function checkLoginCredentials(username: string, password: string) {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .select('password')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found for username
        return { exists: false, passwordMatch: false };
      }
      throw error;
    }

    // Username exists, check password
    return { 
      exists: true, 
      passwordMatch: data.password === password 
    };
  } catch (error) {
    console.error('Error checking credentials:', error);
    throw error;
  }
}

export async function createAccount(credentials: LoginCredentials) {
  try {
    const { data, error } = await supabase
      .from('login_creds')
      .insert([
        {
          username: credentials.username,
          password: credentials.password, // Note: In a production environment, you should hash passwords before storing
          docker_container_id: credentials.docker_container_id
        }
      ])
      .select()

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error creating account:', error)
    return { data: null, error }
  }
}

export const saveCodeFile = async (
  username: string,
  fileName: string,
  codeContent: string,
  oldFileName?: string
): Promise<{ error: Error | null; isUpdate?: boolean }> => {
  try {
    if (oldFileName && oldFileName !== fileName) {
      const { error: updateError } = await supabase
        .from('code_files')
        .update({
          file_name: fileName,
          code_content: codeContent,
          last_saved: new Date().toISOString(),
        })
        .match({ username, file_name: oldFileName });

      if (updateError) throw updateError;
      return { error: null, isUpdate: true };
    }

    const { data: existingFile, error: checkError } = await supabase
      .from('code_files')
      .select('*')
      .match({ username, file_name: fileName })
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingFile) {
      const { error: updateError } = await supabase
        .from('code_files')
        .update({
          code_content: codeContent,
          last_saved: new Date().toISOString(),
        })
        .match({ username, file_name: fileName });

      if (updateError) throw updateError;
      return { error: null, isUpdate: true };
    } else {
      const { error: insertError } = await supabase
        .from('code_files')
        .insert([
          {
            username,
            file_name: fileName,
            code_content: codeContent,
            last_saved: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;
      return { error: null, isUpdate: false };
    }
  } catch (error) {
    console.error('Error saving code file:', error);
    return { error: error as Error };
  }
};

export const getCodeFile = async (
  username: string,
  fileName: string
): Promise<{ data: { code_content: string } | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('code_files')
      .select('code_content')
      .match({ username, file_name: fileName })
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching code file:', error);
    return { data: null, error: error as Error };
  }
};

export const getUserFiles = async (
  username: string
): Promise<{ data: Array<{ file_name: string; last_saved: string }> | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('code_files')
      .select('file_name, last_saved')
      .eq('username', username)
      .order('last_saved', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user files:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteCodeFile = async (
  username: string,
  fileName: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('code_files')
      .delete()
      .match({ username, file_name: fileName });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting code file:', error);
    return { error: error as Error };
  }
}; 