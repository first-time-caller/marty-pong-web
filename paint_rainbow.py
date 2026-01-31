import turtle
import tkinter as tk
from tkinter import ttk

# Set up the screen
screen = turtle.Screen()
screen.title("Paint the Rainbow")
screen.bgcolor("black")
screen.setup(width=900, height=700)

# Create a turtle for drawing (paintbrush)
painter = turtle.Turtle()
painter.shape("circle")
painter.shapesize(0.8, 0.8)
painter.pensize(20)

# Rainbow colors
rainbow_colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"]

# Speed variable (1-10)
current_speed = 5

# Function to update speed from slider
def update_speed(val):
    global current_speed
    current_speed = int(float(val))
    painter.speed(current_speed)

# Create speed slider
canvas = screen.getcanvas()
root = canvas.winfo_toplevel()

# Create frame for slider at the bottom
control_frame = tk.Frame(root, bg='gray20')
control_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=10)

label = tk.Label(control_frame, text="Speed:", bg='gray20', fg='white', font=('Arial', 10))
label.pack(side=tk.LEFT, padx=5)

speed_slider = ttk.Scale(control_frame, from_=1, to=10, orient=tk.HORIZONTAL, 
                         command=update_speed, length=200)
speed_slider.set(current_speed)
speed_slider.pack(side=tk.LEFT, padx=5)

# Set initial speed
painter.speed(current_speed)

# Rainbow arc parameters
radius = 250
arc_angle = 180
center_x = 0
center_y = -200

# Counter and loop to paint the rainbow
counter = 0
for color in rainbow_colors:
    painter.color(color)
    painter.penup()
    
    # Position for this arc (each arc has a different radius)
    current_radius = radius - (counter * 25)
    
    # Start position for the arc
    painter.goto(center_x - current_radius, center_y)
    painter.setheading(90)
    painter.pendown()
    
    # Draw the arc
    painter.circle(current_radius, arc_angle)
    
    counter += 1

# Hide the turtle and keep window open
painter.hideturtle()
turtle.done()
