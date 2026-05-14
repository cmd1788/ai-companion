# -*- coding: utf-8 -*-
"""
AI Companion UI Tree Discovery
Uses pywinauto to read window list and control trees
"""

import json
import sys
import os
from datetime import datetime

# Add paths
sys.path.insert(0, 'C:/Users/asus/ai-companion')

# pywinauto imports
from pywinauto import Application, Desktop
# from pywinauto.handleprops import get_window_rect  # not used directly
from PIL import ImageGrab
import time

def get_window_list():
    """Get list of all visible windows"""
    windows = []
    
    try:
        # Use Desktop to enumerate windows
        desktop = Desktop(backend="win32")
        
        for window in desktop.windows():
            try:
                title = window.window_text()
                if title:  # Only include windows with titles
                    rect = window.rectangle()
                    windows.append({
                        "title": title,
                        "process": window.process_name(),
                        "pid": window.process_id(),
                        "handle": hex(window.handle) if window.handle else "",
                        "visible": window.is_visible(),
                        "focused": window.has_focus(),
                        "rect": {
                            "x": rect.left,
                            "y": rect.top,
                            "width": rect.right - rect.left,
                            "height": rect.bottom - rect.top
                        }
                    })
            except Exception as e:
                print(f"Error reading window: {e}", file=sys.stderr)
                continue
                
    except Exception as e:
        print(f"Error getting window list: {e}", file=sys.stderr)
    
    return windows

def get_ai_companion_window():
    """Find AI Companion window"""
    try:
        desktop = Desktop(backend="win32")
        
        # Try to find AI Companion window
        for window in desktop.windows():
            title = window.window_text()
            if "AI Companion" in title:
                return window
                
        # Also try by process name
        try:
            app = Application(backend="win32").connect(process=73700)
            return app.window()
        except:
            pass
            
    except Exception as e:
        print(f"Error finding AI Companion: {e}", file=sys.stderr)
    
    return None

def build_control_tree(element, depth=0, max_depth=10):
    """Build a tree structure from pywinauto element"""
    if depth > max_depth:
        return None
        
    try:
        node = {
            "name": element.window_text() if hasattr(element, 'window_text') else str(element),
            "control_type": str(element.friendly_class_name()) if hasattr(element, 'friendly_class_name') else "Unknown",
            "automation_id": "",
            "class_name": str(element.class_name()) if hasattr(element, 'class_name') else "",
            "enabled": element.is_enabled() if hasattr(element, 'is_enabled') else True,
            "visible": element.is_visible() if hasattr(element, 'is_visible') else True,
            "rect": {},
            "children": []
        }
        
        # Get rectangle
        try:
            rect = element.rectangle()
            node["rect"] = {
                "x": rect.left,
                "y": rect.top,
                "width": rect.right - rect.left,
                "height": rect.bottom - rect.top
            }
        except:
            pass
        
        # Get children (pywinauto uses children() method)
        try:
            children = element.children()
            for child in children[:20]:  # Limit to 20 children
                child_node = build_control_tree(child, depth + 1, max_depth)
                if child_node:
                    node["children"].append(child_node)
        except:
            pass
            
        return node
        
    except Exception as e:
        return None

def take_screenshot(path):
    """Take screenshot of entire screen"""
    try:
        # Get AI Companion window position
        ai_window = get_ai_companion_window()
        
        if ai_window:
            # Bring to front
            ai_window.set_focus()
            time.sleep(0.5)
        
        # Take screenshot
        screenshot = ImageGrab.grab()
        screenshot.save(path, 'PNG')
        print(f"Screenshot saved: {path}")
        return True
    except Exception as e:
        print(f"Screenshot error: {e}", file=sys.stderr)
        return False

def main():
    timestamp = datetime.now().isoformat()
    
    print("=" * 60)
    print("AI Companion UI Tree Discovery")
    print("=" * 60)
    
    # Get window list
    print("\n[1] Getting window list...")
    windows = get_window_list()
    print(f"Found {len(windows)} windows")
    
    window_list_data = {
        "timestamp": timestamp,
        "windows": windows
    }
    
    # Save window list
    window_list_path = "D:/AI文件/hermes_file/ui_tree/WINDOW_LIST.json"
    with open(window_list_path, 'w', encoding='utf-8') as f:
        json.dump(window_list_data, f, ensure_ascii=False, indent=2)
    print(f"Window list saved: {window_list_path}")
    
    # Find AI Companion
    print("\n[2] Finding AI Companion window...")
    ai_window = get_ai_companion_window()
    
    if ai_window:
        print(f"Found: {ai_window.window_text()}")
        
        # Take before screenshot
        before_screenshot = "D:/AI文件/hermes_file/screenshots/AI_COMPANION_before_ui_tree.png"
        take_screenshot(before_screenshot)
        
        # Build control tree
        print("\n[3] Building control tree...")
        control_tree = build_control_tree(ai_window)
        
        if control_tree:
            # Save control tree
            tree_path = "D:/AI文件/hermes_file/ui_tree/AI_COMPANION_UI_TREE.json"
            with open(tree_path, 'w', encoding='utf-8') as f:
                json.dump(control_tree, f, ensure_ascii=False, indent=2)
            print(f"Control tree saved: {tree_path}")
            
            # Count controls
            def count_controls(node, counts):
                if not node:
                    return
                ct = node.get("control_type", "Unknown")
                if ct in counts:
                    counts[ct] += 1
                else:
                    counts[ct] = 1
                for child in node.get("children", []):
                    count_controls(child, counts)
            
            counts = {}
            count_controls(control_tree, counts)
            
            print("\n[4] Control counts:")
            for ct, count in sorted(counts.items(), key=lambda x: -x[1])[:15]:
                print(f"  {ct}: {count}")
        
        # Take after screenshot
        after_screenshot = "D:/AI文件/hermes_file/screenshots/AI_COMPANION_after_ui_tree.png"
        take_screenshot(after_screenshot)
        
    else:
        print("AI Companion window NOT FOUND")
        
        # Still take screenshot
        before_screenshot = "D:/AI文件/hermes_file/screenshots/AI_COMPANION_before_ui_tree.png"
        take_screenshot(before_screenshot)
    
    print("\n" + "=" * 60)
    print("Discovery complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
