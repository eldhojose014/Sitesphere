import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ROLE_HOME } from "../lib/roles";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const userId = loginData?.user?.id;

    if (!userId) {
      setError("Unable to identify the logged-in user.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("users")
        .select("role, status")
        .eq("user_id", userId)
        .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("Your SiteSphere user profile was not found.");
      setLoading(false);
      return;
    }

    if (profile.status !== "Active") {
      await supabase.auth.signOut();
      setError("Your SiteSphere account is inactive.");
      setLoading(false);
      return;
    }

    setLoading(false);

    const destination = ROLE_HOME[profile.role];

    if (!destination) {
      await supabase.auth.signOut();
      setError("Your account has an invalid role.");
      return;
    }

    navigate(destination, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <BrandLogo variant="full" />
          <p>Sign in to your SiteSphere account</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;