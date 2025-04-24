const userRouter = {
    path: '/users',
    element: <div>Users</div>,
    children: [
        {
            index: true,
            element: <div>Login</div>
        }
    ]
}