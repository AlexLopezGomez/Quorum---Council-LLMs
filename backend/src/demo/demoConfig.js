export const DEMO_MODE = process.env.DEMO_MODE === 'true';

export const DEMO_USER = {
  _id: 'demo-user-000000000000',
  email: 'demo@quorum.dev',
  username: 'demo',
  toPublicJSON() {
    return { id: this._id, email: this.email, username: this.username };
  },
};
