import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Loads the logged-in auth user together with their SiteSphere profile
 * (role / status) from the "users" table.
 */
export default function useCurrentUser() {
  const [state, setState] = useState({
    loading: true,
    authUser: null,
    profile: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !user) {
          setState({ loading: false, authUser: null, profile: null, error: "" });
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("user_id, full_name, email, role, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        setState({
          loading: false,
          authUser: user,
          profile: data || null,
          error: error ? error.message : "",
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            authUser: null,
            profile: null,
            error: err.message || "Unable to load user.",
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
