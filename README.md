# 📦 Inventory Genius – Cloud-Native Inventory Management System

A **modern inventory management system** built with **React + TypeScript + Vite** and deployed using **containerization and container orchestration technologies**.

This project demonstrates **real-world DevOps practices** including containerization, Kubernetes deployments, and scalable cloud-native architecture.

The application is connected to a **Supabase cloud database** and deployed locally using Docker and Kubernetes via Minikube.

---

# 🌐 Live Demo

Check out the live version of Inventory Genius here:  
[Live Demo on Vercel](https://inventory-genius-public.vercel.app/)

# 🚀 Project Overview

**Inventory Genius** is a lightweight inventory management application designed to help businesses manage product inventory efficiently.

It allows users to:

- Manage products and inventory
- Track stock updates
- Perform CRUD operations
- Store and retrieve data from a cloud database

The primary goal of this project is to demonstrate **modern DevOps deployment workflows** using containerized applications.

---

# 🛠️ Tech Stack

## Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

## Backend / Database
- Supabase (PostgreSQL + REST API)

## DevOps & Infrastructure
- Docker
- Kubernetes
- Minikube
- Nginx

---

# 🏗️ System Architecture
```
User Browser
│
▼
Kubernetes Service
│
▼
Kubernetes Deployment
│
▼
Pods (Docker Containers)
│
▼
React Application (Nginx)
│
▼
Supabase Cloud Database
```

This architecture demonstrates **how modern containerized applications are deployed in Kubernetes environments.**

---

# 📂 Project Structure
```
inventory-genius
├── public
├── src
├── supabase
├── Dockerfile
├── .dockerignore
├── package.json
├── vite.config.ts
├── k8s
│ ├── deployment.yaml
│ └── service.yaml
└── README.md
```

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

---

# 🐳 Docker Setup

## Build Docker Image
docker build
--build-arg VITE_SUPABASE_URL=YOUR_URL
--build-arg VITE_SUPABASE_ANON_KEY=YOUR_KEY
-t inventory-genius .

## Run Docker Container
docker run -p 8080:80 inventory-genius

Open in browser:  
http://localhost:8080

---

# ☸️ Kubernetes Deployment

The application is deployed to Kubernetes using **Minikube**.

## Start Minikube Cluster
minikube start --driver=docker


Verify cluster:  
kubectl get nodes

---

## Deploy Application

Apply deployment configuration:  
kubectl apply -f k8s/deployment.yaml


Apply service configuration:  
kubectl apply -f k8s/service.yaml

Verify resources:  
kubectl get deployments  
kubectl get pods  
kubectl get services  

# 🌐 Access Application

Open the application via Minikube service:  
minikube service inventory-service


This will automatically open the application in your browser.

---

# 📈 Scaling the Application

Kubernetes allows scaling the application horizontally.

Increase the number of running containers:

kubectl scale deployment inventory-deployment --replicas=5

Verify scaling:  
kubectl get pods

# 🧪 Useful Debug Commands

View running pods:  
kubectl get pods  
kubectl logs POD_NAME  
kubectl describe pod POD_NAME  
kubectl delete -f k8s/


---

# 📊 Features

- Modern React frontend
- Cloud database integration
- Containerized application
- Kubernetes orchestration
- Scalable microservice-style deployment
- Production-ready static hosting with Nginx

---
