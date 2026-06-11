import { Request, Response } from "express";
import { createAccessToken, createRefreshToken } from "../services/auth.service";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "@prisma/client";
import { prisma } from "../prisma";
import dotenv from 'dotenv'
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_OAUTH_REDIRECT_URI!
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails![0].value;
        const name = profile.displayName

        const user = await prisma.user.upsert({
          where: {
            email
          },
          create: {
            email, name
          },
          update: {}
        });

        done(null, user)
      } catch (err) {
        console.error('GoogleStrategy error:', err);
        done(err, undefined);
      }
    }
  )
);

export const googleAuth = (req: Request, res: Response, next: any) => {
  const state = req.query.state as string || '';
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    state: state
  })(req, res, next);
};

export const googleAuthCallback = (req: Request, res: Response, next: any) => {
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login'
  }, (err, user, info) => {
    if (err) {
      console.error('googleAuthCallback error:', err, info);
      return res.status(500).send('OAuth Error: ' + (err.message || err));
    }
    if (!user) {
      console.error('googleAuthCallback: No user returned', info);
      return res.redirect('/login');
    }
    req.user = user;
    next();
  })(req, res, next);
};

export const afterOAuthLogin = async (req: Request, res: Response) => {
  const user = req.user as User;

  if (!user) {
    res.redirect("/login");
    return;
  }

  const refreshToken = await createRefreshToken(user.id);
  const accessToken = await createAccessToken(user.id);

  res.cookie("refresh-token", refreshToken, {

    httpOnly: true,

    secure: true,

    sameSite: "none",

    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 28),

  });

  res.cookie("access-token", accessToken, {

    httpOnly: false,

    secure: true,

    sameSite: "none",

    expires: new Date(Date.now() + 1000 * 60 * 60),

  });

  const state = req.query.state as string || '';
  if (state === 'mobile_browser') {
    res.redirect(`ridenitt://mobile-auth?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    return;
  }

  if (state === 'mobile') {
    res.redirect(`${FRONTEND_URL}/mobile-auth?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    return;
  }

  if (user.gender && user.phoneNumber) {
    res.redirect(`${FRONTEND_URL}/`);
  } else {
    res.redirect(`${FRONTEND_URL}/sign-up`)
  }
}

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("access-token", {

  secure: true,

  sameSite: "none",

});

res.clearCookie("refresh-token", {

  secure: true,

  sameSite: "none",

});

  res.json({
    data: null,
    error: null
  })
}
